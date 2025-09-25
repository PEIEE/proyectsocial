from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv('MONGODB_URI'))
db = client['discordclone']

db.messages.create_index([('chat_id', 1), ('timestamp', 1)])
db.chats.create_index([('members', 1)])
db.users.create_index([('username', 1)], unique=True)

print("Índices creados exitosamente.")
client.close()