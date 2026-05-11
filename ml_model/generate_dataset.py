import pandas as pd
import numpy as np

np.random.seed(42)
n_samples = 1000

data = {
    'transaction_frequency': np.random.randint(5, 50, n_samples),
    'transaction_regularity': np.random.uniform(0.3, 1.0, n_samples),
    'loan_amount': np.random.randint(100, 10000, n_samples),
    'monthly_income': np.random.randint(100, 2000, n_samples),
    'existing_loans': np.random.randint(0, 3, n_samples),
    'repayment_history': np.random.uniform(0, 1, n_samples),
    'payment_consistency': np.random.uniform(0, 1, n_samples),
}

df = pd.DataFrame(data)

risk_score = (
    (df['existing_loans'] * 0.3) +
    (1 - df['payment_consistency']) * 0.3 +
    (df['loan_amount'] / df['monthly_income']).clip(0, 2) * 0.2 +
    (1 - df['repayment_history']) * 0.2
)

risk_score = (risk_score - risk_score.min()) / (risk_score.max() - risk_score.min())
risk_score += np.random.normal(0, 0.1, n_samples)
risk_score = risk_score.clip(0, 1)
df['default'] = (risk_score > 0.5).astype(int)

df.to_csv('loan_dataset.csv', index=False)
print("=" * 50)
print("DATASET SAVED SUCCESSFULLY!")
print("=" * 50)
print(f"Total samples: {len(df)}")
print(f"Default rate: {df['default'].mean()*100:.1f}%")
print("=" * 50)
print("File saved as: loan_dataset.csv")