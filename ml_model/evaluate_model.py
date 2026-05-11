import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, 
    roc_auc_score, confusion_matrix, classification_report
)
import joblib

# Load the dataset
df = pd.read_csv('loan_dataset.csv')

# Define features (X) and target (y)
feature_columns = [
    'transaction_frequency',
    'transaction_regularity', 
    'loan_amount',
    'monthly_income',
    'existing_loans',
    'repayment_history',
    'payment_consistency'
]

X = df[feature_columns]
y = df['default']

# Split data (80% train, 20% test)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# Train Random Forest model
rf = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42
)

rf.fit(X_train, y_train)

# Make predictions
y_pred = rf.predict(X_test)
y_pred_proba = rf.predict_proba(X_test)[:, 1]

# Calculate metrics
accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_pred_proba)
conf_matrix = confusion_matrix(y_test, y_pred)

# Print Results
print("=" * 60)
print("RANDOM FOREST MODEL PERFORMANCE METRICS")
print("=" * 60)
print(f"Accuracy:  {accuracy:.4f} ({accuracy*100:.2f}%)")
print(f"Precision: {precision:.4f} ({precision*100:.2f}%)")
print(f"Recall:    {recall:.4f} ({recall*100:.2f}%)")
print(f"F1-Score:  {f1:.4f} ({f1*100:.2f}%)")
print(f"ROC-AUC:   {roc_auc:.4f} ({roc_auc*100:.2f}%)")
print("=" * 60)
print("\nConfusion Matrix:")
print("                 Predicted")
print("              Non-Default  Default")
print(f"Actual Non-Default    {conf_matrix[0,0]}         {conf_matrix[0,1]}")
print(f"Actual Default        {conf_matrix[1,0]}         {conf_matrix[1,1]}")
print("=" * 60)
print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Non-Default', 'Default']))

# Get feature importance
feature_importance = pd.DataFrame({
    'feature': feature_columns,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=False)

print("\nFeature Importance (Ranked):")
for i, row in feature_importance.iterrows():
    print(f"   {row['feature']}: {row['importance']:.4f} ({row['importance']*100:.1f}%)")

# Save the model
joblib.dump(rf, 'random_forest_model.pkl')
print("\n✅ Model saved as 'random_forest_model.pkl'")
print("=" * 60)