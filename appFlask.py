from flask import Flask, request, jsonify
import torch
from transformers import GPT2LMHeadModel, GPT2Tokenizer
import pandas as pd
import csv
from flask_cors import CORS
import random
# Chargement du modèle pré-entraîné GPT-2 à partir de l'emplacement spécifié
model_path = 'C:/Users/DELL/Desktop/Modele/'
model = GPT2LMHeadModel.from_pretrained(model_path)
tokenizer = GPT2Tokenizer.from_pretrained(model_path)

app = Flask(__name__)
CORS(app,supports_credentials=True)

# Chargez les données à partir du fichier CSV
data = pd.read_csv('C:/Users/DELL/Downloads/top_5000_influencers.csv')

# Fonction pour générer du texte à partir du modèle GPT-2
def generate_text(user_info):
    user_name = user_info['user_name']
    followers = user_info['followers']
    following = user_info['following']
    posts = user_info['posts']
    engagement_rate = user_info['taux_engagement']
    topic = user_info['Topic']
    profile_desc = user_info['profile_desc']

    # Liste de modèles de texte pour la biographie
    bio_templates = [
        f"{user_name} is an Instagram user with {followers:.0f} followers and {following} following. "
        f"They have posted {posts} times on Instagram. "
        f"Their engagement rate is {engagement_rate} and they are passionate about {topic}. "
        f"Known for their {profile_desc}. Follow them for more updates.",
        
        f"Welcome to {user_name}'s Instagram profile! With {followers:.0f} followers and {following} following, they are a true influencer. "
        f"They've shared {posts} moments on Instagram and have an engagement rate of {engagement_rate}. Discover their passion for {topic} and their unique {profile_desc}. Follow for updates!",
        
        f"{user_name} on Instagram 📸 {followers:.0f} followers, {following} following. {posts} posts and an engagement rate of {engagement_rate}. "
        f"Passionate about {topic} and known for {profile_desc}. Follow for exciting content!",
        
        f"{user_name} is an Instagram enthusiast with a following of {followers:.0f} people and they're following {following} accounts."
        f"They've shared {posts} captivating moments on Instagram. Their engagement rate is {engagement_rate}, and they are dedicated to all things {topic}. Explore their {profile_desc} and hit that follow button for the latest updates!",
        
        f"{user_name} is a social media enthusiast with {followers:.0f} followers and {following} following on Instagram."
        f"With {posts} posts under their belt, they've built an engaged community. Their passion for {topic} shines through, and their profile reflects their {profile_desc}. Follow for daily inspiration! 📷",
        
        f"{user_name} is a creative soul on Instagram, captivating {followers:.0f} followers with {posts} posts and an impressive engagement rate."
        f"They have a passion for {topic} and their profile reflects their unique {profile_desc}. Follow along for inspiration!",
        
        f"Meet {user_name}, an Instagram enthusiast with a fanbase of {followers:.0f} followers and a following of {following}."
        f"With {posts} posts to their name, their engagement rate is rocking the charts at {engagement_rate}! 🚀 Stay tuned for their captivating content on {topic}. Don't miss out, hit that follow button now!",
        
        f"Step into the world of {user_name}, an Instagram maven boasting {followers:.0f} followers and {following} followings."
        f"Their Instagram journey includes {posts} posts and an impressive engagement rate of {engagement_rate}. Explore their love for {topic} and get inspired by their {profile_desc}. Follow for a daily dose of inspiration!",
        
        f"{user_name} - Instagram Extraordinaire! 📸 With {followers:.0f} followers and a following of {following},"
        f" they've graced Instagram with {posts} posts and maintain a stunning engagement rate of {engagement_rate}. Dive into their world of {topic} and discover the uniqueness of their {profile_desc}. Follow for your daily dose of inspiration and creativity!",
        
        f"Welcome to the Instagram universe of {user_name}! 🌟 Boasting a remarkable {followers:.0f} followers and {following} followings,"
        f"they've shared their life journey through {posts} captivating posts, all while maintaining an impressive engagement rate of {engagement_rate}. Delve into their passion for {topic} and uncover the essence of their {profile_desc}. Follow for a daily dose of {topic} inspiration!",
        
        f"Join the Instagram adventure with {user_name}! 📷 With {followers:.0f} followers and {following} followings, they've painted their story through {posts} posts and an engaging journey at {engagement_rate}. "
        f"Explore their world of {topic} and embrace the spirit of their {profile_desc}. Follow for your daily dose of inspiration and joy!",
        
    ]

    # Mélanger les modèles de texte
    random.shuffle(bio_templates)

    # Sélectionner un modèle de texte
    bio_template = bio_templates[0]  # Vous pouvez utiliser [1] ou [2] pour d'autres modèles

    # Remplacer les variables dans le modèle de texte
    user_bio = bio_template.format(
        user_name=user_name,
        followers=followers,
        following=following,
        posts=posts,
        engagement_rate=engagement_rate,
        topic=topic,
        profile_desc=profile_desc
    )

    # Génération de la biographie complète
    input_ids = tokenizer.encode(user_bio, return_tensors="pt")
    with torch.no_grad():
        output = model.generate(input_ids, max_length=100, num_return_sequences=1, temperature=0.7, top_k=50, top_p=0.92)
    bio_generated = tokenizer.decode(output[0], skip_special_tokens=True)

    return bio_generated

# Définissez une route pour la racine de l'URL
@app.route('/')
def index():
    return "Bienvenue sur l'application Flask de génération de biographies!"

@app.route('/generate_bio', methods=['POST'])
def generate_bio():
    user_name = request.json.get('user_name')  # Récupérez le nom d'utilisateur à partir de la requête POST
    user_info = None

    # Recherchez les informations de l'utilisateur dans le fichier CSV
    for _, row in data.iterrows():
        if row['user_name'] == user_name:
            user_info = row.to_dict()
            break

    if user_info is None:
        return jsonify({'error': 'Utilisateur non trouvé'})

  
    # Utilisez le modèle pour générer la biographie
    generated_bio = generate_text(user_info)

    return jsonify({'bio': generated_bio})


# ...


if __name__ == '__main__':
    app.run(debug=True, port=3007)
