import argparse
import json
import math
import re
import statistics
import sys
import warnings
import zlib
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.exceptions import InconsistentVersionWarning


BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "loan_dataset.csv"
MODEL_PATH = BASE_DIR / "random_forest_model.pkl"
FEATURE_COLUMNS = [
    "transaction_frequency",
    "transaction_regularity",
    "loan_amount",
    "monthly_income",
    "existing_loans",
    "repayment_history",
    "payment_consistency",
]
TRANSACTION_ID_RE = re.compile(r"^(?:MP|PP|CI|CO|RC)\d+\.\d+\.T\d+$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.0$")
NUMBER_RE = re.compile(r"^-?\d+(?:\.\d+)?$")


def clamp(value, minimum=0.0, maximum=1.0):
    return max(minimum, min(maximum, value))


def normalize_number(value, default=0.0):
    if value in (None, "", "null"):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_int(value, default=0):
    return int(round(normalize_number(value, default)))


def escape_pdf_text(value):
    return (
        value.replace("\\\\", "\\")
        .replace("\\(", "(")
        .replace("\\)", ")")
        .replace("\\n", "\n")
        .strip()
    )


def extract_pdf_stream_text(pdf_path):
    raw_pdf = Path(pdf_path).read_bytes()
    text_elements = []
    page_index = -1

    for stream_match in re.finditer(rb"stream\r?\n", raw_pdf):
        start = stream_match.end()
        end = raw_pdf.find(b"endstream", start)
        if end == -1:
            continue

        raw_stream = raw_pdf[start:end].rstrip(b"\r\n")
        try:
            decoded_stream = zlib.decompress(raw_stream).decode("latin1", errors="ignore")
        except Exception:
            continue

        if "(Tran ID)Tj" in decoded_stream:
            page_index += 1

        if "BT" not in decoded_stream or "Tm" not in decoded_stream:
            continue

        for block in re.finditer(r"BT(.*?)ET", decoded_stream, re.S):
            block_text = block.group(1)
            tm_matches = re.findall(
                r"1 0 0 1 (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Tm",
                block_text,
            )
            if not tm_matches:
                continue

            x_str, y_str = tm_matches[-1]
            x = float(x_str)
            y = float(y_str)
            text_matches = re.findall(r"\(((?:\\.|[^\\)])*)\)\s*Tj", block_text)

            for text_match in text_matches:
                value = escape_pdf_text(text_match)
                if value:
                    text_elements.append(
                        {
                            "page": max(page_index, 0),
                            "x": x,
                            "y": y,
                            "text": value,
                        }
                    )

    return text_elements


def group_rows_by_page(text_elements):
    rows_by_page = defaultdict(list)

    for item in text_elements:
        rows = rows_by_page[item["page"]]
        matched_row = None

        for row in rows:
            if abs(row["y"] - item["y"]) <= 0.35:
                matched_row = row
                break

        if not matched_row:
            matched_row = {"y": item["y"], "items": []}
            rows.append(matched_row)

        matched_row["items"].append(item)

    for page, rows in rows_by_page.items():
        rows.sort(key=lambda row: row["y"], reverse=True)
        for row in rows:
            row["items"].sort(key=lambda item: item["x"])

    return rows_by_page


def classify_column(x_position):
    if x_position < 170:
        return "transaction_id"
    if x_position < 295:
        return "transaction_date"
    if x_position < 390:
        return "service_type"
    if x_position < 519:
        return "receiver"
    if x_position < 610:
        return "deposit"
    if x_position < 691:
        return "withdrawal"
    return "balance"


def parse_ecocash_statement(pdf_path):
    text_elements = extract_pdf_stream_text(pdf_path)
    rows_by_page = group_rows_by_page(text_elements)
    page_headers = {}
    meta_lookup = {}

    for item in text_elements:
        key = item["text"]
        meta_lookup.setdefault(key, []).append(item)
        if item["text"] == "Tran ID":
            page_headers[item["page"]] = item["y"]

    transactions = []

    for page, rows in sorted(rows_by_page.items()):
        header_y = page_headers.get(page)
        if header_y is None:
            continue

        for row in rows:
            if row["y"] >= header_y:
                continue

            record = {
                "transaction_id": None,
                "transaction_date": None,
                "service_type": None,
                "receiver": None,
                "deposit": 0.0,
                "withdrawal": 0.0,
                "balance": None,
            }

            for item in row["items"]:
                text = item["text"]
                column = classify_column(item["x"])

                if column == "transaction_id" and TRANSACTION_ID_RE.match(text):
                    record["transaction_id"] = text
                elif column == "transaction_date" and DATE_RE.match(text):
                    record["transaction_date"] = text
                elif column in {"deposit", "withdrawal", "balance"} and NUMBER_RE.match(text):
                    record[column] = normalize_number(text)
                elif column in {"service_type", "receiver"}:
                    existing = record[column] or ""
                    record[column] = f"{existing} {text}".strip()

            meaningful = any(
                [
                    record["transaction_id"],
                    record["transaction_date"],
                    record["service_type"],
                    record["receiver"],
                    record["deposit"] > 0,
                    record["withdrawal"] > 0,
                ]
            )

            if meaningful:
                record["entry_type"] = (
                    "credit"
                    if record["deposit"] > 0 and record["withdrawal"] == 0
                    else "debit"
                    if record["withdrawal"] > 0 and record["deposit"] == 0
                    else "mixed"
                    if record["deposit"] > 0 and record["withdrawal"] > 0
                    else "info"
                )
                transactions.append(record)

    wallet_number = None
    current_balance = None
    currency = None
    from_date = None
    to_date = None
    print_date = None
    account_name = None

    for page, rows in sorted(rows_by_page.items()):
        for row in rows:
            row_text = " ".join(item["text"] for item in row["items"])
            if "Wallet Number:" in row_text:
                numbers = [item["text"] for item in row["items"] if NUMBER_RE.match(item["text"]) or item["text"].isdigit()]
                if numbers:
                    wallet_number = numbers[-1]
            elif "Current Balance:" in row_text:
                numbers = [item["text"] for item in row["items"] if NUMBER_RE.match(item["text"])]
                if numbers:
                    current_balance = normalize_number(numbers[-1])
            elif "Balance at " in row_text and current_balance is None:
                numbers = [item["text"] for item in row["items"] if NUMBER_RE.match(item["text"])]
                if numbers:
                    current_balance = normalize_number(numbers[-1])
            elif "Currency:" in row_text:
                trailing = [item["text"] for item in row["items"] if item["text"] != "Currency:"]
                if trailing:
                    currency = trailing[-1]
            elif "From Date:" in row_text:
                matches = [item["text"] for item in row["items"] if re.match(r"^\d{4}-\d{2}-\d{2}$", item["text"])]
                if matches:
                    from_date = matches[-1]
            elif "To Date:" in row_text:
                matches = [item["text"] for item in row["items"] if re.match(r"^\d{4}-\d{2}-\d{2}$", item["text"])]
                if matches:
                    to_date = matches[-1]
            elif "Print Date:" in row_text:
                matches = [item["text"] for item in row["items"] if re.match(r"^\d{2}-[A-Za-z]{3}-\d{2}$", item["text"])]
                if matches:
                    print_date = matches[-1]

    if "VALENTINE" in meta_lookup:
        account_name = "VALENTINE"

    summary = build_statement_summary(transactions, current_balance)

    return {
        "walletNumber": wallet_number,
        "currency": currency or "USD",
        "accountName": account_name,
        "fromDate": from_date,
        "toDate": to_date,
        "printDate": print_date,
        "currentBalance": current_balance,
        "summary": summary,
        "transactions": transactions,
    }


def build_statement_summary(transactions, current_balance):
    deposit_values = [row["deposit"] for row in transactions if row["deposit"] > 0]
    withdrawal_values = [row["withdrawal"] for row in transactions if row["withdrawal"] > 0]
    balances = [row["balance"] for row in transactions if row["balance"] is not None]
    dated_rows = [
        datetime.strptime(row["transaction_date"], "%Y-%m-%d %H:%M:%S.0")
        for row in transactions
        if row["transaction_date"]
    ]

    total_deposits = round(sum(deposit_values), 2)
    total_withdrawals = round(sum(withdrawal_values), 2)
    net_cash_flow = round(total_deposits - total_withdrawals, 2)
    deposit_count = len(deposit_values)
    withdrawal_count = len(withdrawal_values)
    days_covered = 0
    active_days = 0
    average_gap_days = 0.0
    gap_std_days = 0.0

    if dated_rows:
        sorted_dates = sorted(dated_rows)
        unique_days = sorted({dt.date() for dt in sorted_dates})
        active_days = len(unique_days)
        days_covered = max((sorted_dates[-1] - sorted_dates[0]).days + 1, 1)

        if len(sorted_dates) > 1:
            gaps = [
                (sorted_dates[index] - sorted_dates[index - 1]).total_seconds() / 86400
                for index in range(1, len(sorted_dates))
            ]
            average_gap_days = round(sum(gaps) / len(gaps), 4)
            gap_std_days = round(statistics.pstdev(gaps), 4) if len(gaps) > 1 else 0.0

    average_deposit = round(total_deposits / deposit_count, 2) if deposit_count else 0.0
    average_withdrawal = round(total_withdrawals / withdrawal_count, 2) if withdrawal_count else 0.0
    average_balance = round(sum(balances) / len(balances), 2) if balances else current_balance or 0.0
    min_balance = round(min(balances), 2) if balances else current_balance or 0.0
    max_balance = round(max(balances), 2) if balances else current_balance or 0.0
    estimated_monthly_income = round(total_deposits / max(days_covered / 30.0, 1), 2) if total_deposits > 0 else 0.0

    return {
        "transactionCount": len(transactions),
        "depositCount": deposit_count,
        "withdrawalCount": withdrawal_count,
        "totalDeposits": total_deposits,
        "totalWithdrawals": total_withdrawals,
        "netCashFlow": net_cash_flow,
        "averageDeposit": average_deposit,
        "averageWithdrawal": average_withdrawal,
        "averageBalance": average_balance,
        "minBalance": min_balance,
        "maxBalance": max_balance,
        "daysCovered": days_covered,
        "activeDays": active_days,
        "averageGapDays": average_gap_days,
        "gapStdDays": gap_std_days,
        "currentBalance": current_balance,
        "estimatedMonthlyIncome": estimated_monthly_income,
    }


def derive_features(application):
    statement_summary = application.get("statementSummary") or {}
    employment_status = str(application.get("employmentStatus") or "").strip().lower()
    monthly_income = normalize_number(application.get("monthlyIncome"))
    loan_amount = normalize_number(application.get("amount"))
    existing_loans = normalize_int(application.get("existingLoans"))

    inferred_income = normalize_number(statement_summary.get("estimatedMonthlyIncome"))
    if monthly_income <= 0 and inferred_income > 0:
        monthly_income = inferred_income

    transaction_count = normalize_number(statement_summary.get("transactionCount"))
    days_covered = max(normalize_number(statement_summary.get("daysCovered"), 30), 1)
    total_deposits = normalize_number(statement_summary.get("totalDeposits"))
    total_withdrawals = normalize_number(statement_summary.get("totalWithdrawals"))
    average_balance = normalize_number(statement_summary.get("averageBalance"))
    min_balance = normalize_number(statement_summary.get("minBalance"))
    active_days = normalize_number(statement_summary.get("activeDays"))
    gap_std_days = normalize_number(statement_summary.get("gapStdDays"))
    average_gap_days = normalize_number(statement_summary.get("averageGapDays"))

    if transaction_count <= 0:
        income_based_frequency = max(5, min(49, round(monthly_income / 50))) if monthly_income > 0 else 10
        transaction_frequency = income_based_frequency
    else:
        transaction_frequency = round(transaction_count / max(days_covered / 30.0, 1 / 30.0))
        transaction_frequency = max(5, min(49, transaction_frequency))

    if transaction_count > 1 and average_gap_days > 0:
        transaction_regularity = clamp(1 / (1 + (gap_std_days / average_gap_days)))
    else:
        transaction_regularity = {
            "employed": 0.82,
            "self-employed": 0.68,
            "business": 0.68,
            "contract": 0.55,
        }.get(employment_status, 0.45)

    balance_strength = clamp(average_balance / max(monthly_income, 1)) if monthly_income > 0 else 0.2
    cashflow_cover = clamp(total_deposits / max(total_withdrawals, 1)) if total_withdrawals > 0 else clamp(total_deposits / max(monthly_income, 1))
    positive_balance_factor = 1.0 if min_balance >= 0 else 0.4
    repayment_history = clamp((cashflow_cover * 0.45) + (balance_strength * 0.35) + (positive_balance_factor * 0.20))

    activity_ratio = clamp(active_days / max(days_covered, 1)) if active_days > 0 else 0.0
    payment_consistency = clamp((transaction_regularity * 0.55) + (activity_ratio * 0.30) + (positive_balance_factor * 0.15))

    if monthly_income <= 0 and total_deposits > 0:
        months_covered = max(days_covered / 30.0, 1)
        monthly_income = round(total_deposits / months_covered, 2)

    if monthly_income <= 0:
        monthly_income = max(100.0, loan_amount * 0.6)

    return {
        "transaction_frequency": int(transaction_frequency),
        "transaction_regularity": round(transaction_regularity, 4),
        "loan_amount": round(max(loan_amount, 100.0), 2),
        "monthly_income": round(monthly_income, 2),
        "existing_loans": max(existing_loans, 0),
        "repayment_history": round(repayment_history, 4),
        "payment_consistency": round(payment_consistency, 4),
    }


def load_training_frame():
    return pd.read_csv(DATASET_PATH)


def train_model():
    frame = load_training_frame()
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
    )
    model.fit(frame[FEATURE_COLUMNS], frame["default"])
    joblib.dump(model, MODEL_PATH)
    return model


def load_or_train_model():
    try:
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always", InconsistentVersionWarning)
            model = joblib.load(MODEL_PATH)
        if any(issubclass(item.category, InconsistentVersionWarning) for item in caught):
            return train_model()
        return model
    except Exception:
        return train_model()


def make_decision_from_probability(default_probability, features):
    risk_score = round(default_probability, 4)
    credit_score = round((1 - risk_score) * 100, 2)

    if risk_score <= 0.30:
        risk_level = "low"
        interest_rate = 8.5
    elif risk_score <= 0.50:
        risk_level = "medium"
        interest_rate = 11.5
    else:
        risk_level = "high"
        interest_rate = 16.5

    approved = risk_score <= 0.50
    duration = max(normalize_int(features.get("duration"), 12), 1)
    loan_amount = normalize_number(features.get("amount"))
    monthly_rate = interest_rate / 100 / 12
    monthly_payment = (
        loan_amount / duration
        if monthly_rate == 0
        else loan_amount
        * monthly_rate
        / (1 - math.pow(1 + monthly_rate, -duration))
    )

    return {
        "approved": approved,
        "status": "approved" if approved else "rejected",
        "riskScore": risk_score,
        "creditScore": credit_score,
        "riskLevel": risk_level,
        "interestRate": round(interest_rate, 2) if approved else 0.0,
        "monthlyPayment": round(monthly_payment, 2) if approved else 0.0,
    }


def score_application(application):
    model = load_or_train_model()
    feature_map = derive_features(application)
    feature_frame = pd.DataFrame([[feature_map[column] for column in FEATURE_COLUMNS]], columns=FEATURE_COLUMNS)
    default_probability = float(model.predict_proba(feature_frame)[0][1])
    decision = make_decision_from_probability(default_probability, application)

    reasons = [
        f"ML model predicted default probability of {decision['riskScore'] * 100:.1f}%",
        f"Transaction frequency feature: {feature_map['transaction_frequency']}",
        f"Transaction regularity feature: {feature_map['transaction_regularity']}",
        f"Repayment history proxy: {feature_map['repayment_history']}",
        f"Payment consistency proxy: {feature_map['payment_consistency']}",
    ]

    decision["decisionReason"] = (
        f"{decision['status'].upper()}: "
        f"Credit score {decision['creditScore']:.1f}/100, "
        f"Risk level {decision['riskLevel']}. "
        + ". ".join(reasons)
    )

    return {
        "engine": "random_forest",
        "modelPath": str(MODEL_PATH),
        "features": feature_map,
        "decision": decision,
    }


def print_json(payload):
    sys.stdout.write(json.dumps(payload, default=str))


def read_stdin_json():
    raw = sys.stdin.read()
    return json.loads(raw or "{}")


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    analyze_parser = subparsers.add_parser("analyze-statement")
    analyze_parser.add_argument("--pdf", required=True)

    subparsers.add_parser("score")

    args = parser.parse_args()

    if args.command == "analyze-statement":
        print_json(parse_ecocash_statement(args.pdf))
        return

    if args.command == "score":
        application = read_stdin_json()
        print_json(score_application(application))
        return


if __name__ == "__main__":
    main()
