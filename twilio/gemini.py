import google.generativeai as genai
genai.configure(api_key=YOUR_KEY)
models = genai.list_models().models
print([m.name for m in models])