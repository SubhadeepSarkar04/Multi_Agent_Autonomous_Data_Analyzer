import os
from typing import Union
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# pyrefly: ignore [missing-import]
from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq

def get_llm(provider: str, model_name: str) -> Union[ChatGroq, ChatOllama]:
    if provider == "groq":
        api_key = os.environ.get("GROQ_API_KEY")
        if api_key:
            return ChatGroq(model=model_name, temperature=0.0, api_key=api_key)
        return ChatGroq(model=model_name, temperature=0.0)
    if provider == "ollama":
        return ChatOllama(model=model_name, temperature=0.0)
    raise ValueError(f"Unsupported provider: {provider}")