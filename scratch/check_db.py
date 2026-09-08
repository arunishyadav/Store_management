import requests

def test_both_urls():
    h = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    urls = [
        "https://finsen-store-web.onrender.com/api/auth/login",
        "https://store-management-z9xf.onrender.com/api/auth/login"
    ]
    
    for url in urls:
        print("--- Testing URL:", url, "---")
        try:
            res1 = requests.post(url, json={"userId": "wronguser999", "password": "password123"}, headers=h)
            print("Wrong user status code:", res1.status_code)
            print("Wrong user response:", res1.text[:200])
        except Exception as e:
            print("Error testing URL:", url, e)

if __name__ == "__main__":
    test_both_urls()
