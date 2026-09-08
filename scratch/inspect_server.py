import requests

def inspect_server():
    url = "https://finsen-store-web.onrender.com/api/auth/login"
    h = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    res = requests.post(url, json={"userId": "wronguser999", "password": "password123"}, headers=h)
    print("Status Code:", res.status_code)
    print("Response Headers:")
    for k, v in res.headers.items():
        print(f"  {k}: {v}")
    print("Body:", res.text)

if __name__ == "__main__":
    inspect_server()
