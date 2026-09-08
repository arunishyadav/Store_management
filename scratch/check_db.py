import requests

def check():
    url = "https://finsen-store-web.onrender.com/api/auth/login"
    h = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    res = requests.post(url, json={"userId": "@finsen-admin", "password": "7Finsenxyz#"}, headers=h)
    print("Login status:", res.status_code)
    try:
        data = res.json()
        token = data.get("token")
        print("User ID logged in:", data.get("userId"), "Role:", data.get("role"))
        
        headers = {"Authorization": f"Bearer {token}", "User-Agent": "Mozilla/5.0"}
        entries_res = requests.get("https://finsen-store-web.onrender.com/api/v1/stock-entries", headers=headers)
        print("Entries status code:", entries_res.status_code)
        if entries_res.status_code == 200:
            entries_data = entries_res.json()
            print("Total Stock Entries in connected Database:", len(entries_data))
            for item in entries_data[:5]:
                loc_name = item.get("location", {}).get("name") if item.get("location") else "N/A"
                mat_name = item.get("material", {}).get("name") if item.get("material") else "N/A"
                print(f"ID: {item.get('id')} | LR/GR: {item.get('lrGrNumber')} | Material: {mat_name} | Location: {loc_name}")
        else:
            print("Response text:", entries_res.text[:200])
    except Exception as e:
        print("Error parsing json:", e)
        print("Raw text:", res.text[:200])

if __name__ == "__main__":
    check()
