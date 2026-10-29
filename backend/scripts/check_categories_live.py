import requests
import json

def check_categories():
    login = requests.post('http://127.0.0.1:8000/api/auth/login', json={'email': 'phonepe_user_4bd16e@sahayakfin-demo.in', 'password': 'TestPassword@123'}).json()
    token = login['access_token']
    dash = requests.get('http://127.0.0.1:8000/api/dashboard/summary', headers={'Authorization': f'Bearer {token}'}).json()
    categories = dash.get('expenseCategories', [])
    print(f"Categories count: {len(categories)}")
    for c in categories:
        print(f"  - {c['name']}: INR {c['value']} ({c['percentage']} pct)")

    # Also Nitin Kulkarni
    login_nitin = requests.post('http://127.0.0.1:8000/api/auth/demo-login/USER0001').json()
    token_nitin = login_nitin['access_token']
    dash_nitin = requests.get('http://127.0.0.1:8000/api/dashboard/summary', headers={'Authorization': f'Bearer {token_nitin}'}).json()
    print(f"\nNitin Kulkarni categories count: {len(dash_nitin.get('expenseCategories', []))}")
    for c in dash_nitin.get('expenseCategories', []):
        print(f"  - {c['name']}: INR {c['value']} ({c['percentage']} pct)")

if __name__ == '__main__':
    check_categories()
