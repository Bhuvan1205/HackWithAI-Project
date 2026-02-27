import httpx
import time
import json
import asyncio

API_URL = "http://127.0.0.1:8000/api/v1/score-intelligence"

# Standard Base Payload
base_payload = {
    "claim_id": "TEST_CASE_0",
    "hospital_id": "H1",
    "patient_id": "PAT0001",
    "procedure_code": "P4",
    "package_rate": 40000.0,
    "claim_amount": 40000.0,
    "admission_date": "2024-03-01",
    "discharge_date": "2024-03-04",
    "is_inpatient": 1
}

async def trigger_test_case(name, index, overrides=None):
    payload = base_payload.copy()
    payload["claim_id"] = f"TEST_CLM_{index}"
    if overrides:
        payload.update(overrides)

    try:
        async with httpx.AsyncClient() as client:
            print(f"\n--- Running {name} ---")
            print(f"Payload ID: {payload['claim_id']}")
            response = await client.post(f"{API_URL}?test_case={index}", json=payload, timeout=10.0)
            print(f"Status Code: {response.status_code}")
            try:
                data = response.json()
                print(f"Final Risk Score: {data.get('final_risk_score')}")
                print(f"Risk Level: {data.get('risk_level')}")
                print(f"Pattern Detected: {data.get('fraud_pattern_detected')}")
            except Exception:
                print(f"Raw Content: {response.text}")
    except Exception as e:
        print(f"Error during {name}: {e}")

async def run_all_tests():
    # TEST CASE 1: LOW RISK
    await trigger_test_case("TEST CASE 1 - LOW RISK", 1, {"claim_amount": 5000, "package_rate": 5000})

    # TEST CASE 2: MEDIUM RISK
    await trigger_test_case("TEST CASE 2 - MEDIUM RISK", 2, {"claim_amount": 25000, "package_rate": 20000})

    # TEST CASE 3: HIGH RISK (Extreme Cost Deviation/Upcoding)
    await trigger_test_case("TEST CASE 3 - HIGH RISK", 3, {"claim_amount": 150000, "package_rate": 30000})

    # TEST CASE 5: Rule Only Case (Zero Day Inpatient)
    await trigger_test_case("TEST CASE 5 - ZERO DAY INPATIENT", 5, {"is_inpatient": 1, "admission_date": "2024-03-01", "discharge_date": "2024-03-01"})

if __name__ == "__main__":
    asyncio.run(run_all_tests())
