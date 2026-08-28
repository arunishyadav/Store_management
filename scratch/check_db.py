import requests

def check():
    url = "https://finsen-store-web.onrender.com/api/auth/login"
    res = requests.post(url, json={"userId": "@finsen-admin", "password": "7Finsenxyz#"})
    print("Login status:", res.status_code)
    data = res.json()
    token = data.get("token")
    print("User ID logged in:", data.get("userId"), "Role:", data.get("role"))
    
    headers = {"Authorization": f"Bearer {token}"}
    entries_res = requests.get("https://finsen-store-web.onrender.com/api/v1/stock-entries?size=1000", headers=headers)
    print("Entries status:", entries_res.status_code)
    entries_data = entries_res.json()
    total = entries_data.get("totalElements", 0)
    print("Total Stock Entries in connected Database:", total)
    
    content = entries_data.get("content", [])
    print(f"Sample entries (First {min(10, len(content))}):")
    for item in content[:10]:
        loc_name = item.get("location", {}).get("name") if item.get("location") else "N/A"
        mat_name = item.get("material", {}).get("name") if item.get("material") else "N/A"
        print(f"ID: {item.get('id')} | LR/GR: {item.get('lrGrNumber')} | Material: {mat_name} | Location: {loc_name} | Contractor: {item.get('contractorName')}")

if __name__ == "__main__":
    check()
