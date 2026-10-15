import os

# 개발자 컴퓨터의 backend/.env(Supabase·관리자 토큰)가 테스트에 섞이지 않게
os.environ["CAPSTONE_NO_DOTENV"] = "1"
