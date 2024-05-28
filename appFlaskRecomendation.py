from flask import Flask, request, jsonify
import tensorflow as tf
from flask_cors import CORS
from keras.utils import custom_object_scope
from sklearn.preprocessing import MinMaxScaler
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd
# ... (initialisation de Flask, chargement du modèle, etc.)
def contrastive_loss(y_true, y_pred):
    margin = 1
    square_pred = tf.square(y_pred)
    margin_square = tf.square(tf.maximum(margin - y_pred, 0))
    return tf.reduce_mean(y_true * square_pred + (1 - y_true) * margin_square)


with custom_object_scope({'contrastive_loss': contrastive_loss}):
    siamese_model = tf.keras.models.load_model('C:/Users/DELL/Desktop/Modele1/siamese_model')
data=pd.read_csv('C:/Users/DELL/Downloads/top_5000_influencers.csv')
# Supposons également que 'taux engagement' est le nom de la colonne
data['taux_engagement'] = data['taux_engagement'].str.replace('%', '').astype(float) / 100.0
# Prétraitement des données
# Chargez vos données (assurez-vous que "data" est correctement défini)

# Créez un MinMaxScaler
minmax_scaler = MinMaxScaler()

# Normalisez les colonnes numériques
data['posts'] = minmax_scaler.fit_transform(data[['posts']])
data['followers'] = minmax_scaler.fit_transform(data[['followers']])
data['following'] = minmax_scaler.fit_transform(data[['following']])
data['taux_engagement'] = minmax_scaler.fit_transform(data[['taux_engagement']])

# Transformer la colonne 'Topic' en vecteurs TF-IDF
tfidf_vectorizer = TfidfVectorizer(stop_words='english')
topic_vectors = tfidf_vectorizer.fit_transform(data['Topic'])

# Concaténez les colonnes pour créer la matrice de données utilisateur
user_data_matrix = pd.concat([
    pd.DataFrame(data['followers']),
    pd.DataFrame(data['following']),
    pd.DataFrame(data['posts']),
    pd.DataFrame(data['taux_engagement']),
    pd.DataFrame(topic_vectors.toarray())
], axis=1)
user_names = data['acount_name'].tolist()

app = Flask(__name__)
CORS(app,supports_credentials=True)

# Définissez une route pour la racine de l'URL
@app.route('/')
def index():
    return "Bienvenue sur l'application Flask de génération de biographies!"
@app.route('/find_similar_users', methods=['POST'])
def find_similar_users():
    # Récupérez le nom d'utilisateur depuis la requête POST
    data = request.get_json()
    username_to_find = data.get('acount_name', None)

    if username_to_find is None:
        return jsonify({'error': 'Nom d\'utilisateur manquant dans la requête'})

    # Fonction pour rechercher l'indice d'un utilisateur par son nom d'utilisateur
    def find_user_index(username, user_names):
        try:
            user_index = user_names.index(username)
            return user_index
        except ValueError:
            print(f"L'utilisateur avec le nom d'utilisateur '{username}' n'a pas été trouvé.")
            return None

    # Trouvez l'indice de l'utilisateur à recommander
    user_to_recommend = find_user_index(username_to_find, user_names)

    if user_to_recommend is not None:
        # Utilisez le modèle pour calculer les scores de similarité avec tous les autres utilisateurs
        similarity_scores = []  # Stocke les scores de similarité

        # Parcourez tous les utilisateurs (indices) sauf l'utilisateur à recommander
        for i in range(len(user_data_matrix)):
            if i != user_to_recommend:
                # Utilisez les vecteurs encodés de l'utilisateur à recommander et de l'utilisateur actuel
                distance_scores = siamese_model.predict([user_data_matrix.values[user_to_recommend].reshape(1, -1), user_data_matrix.values[i].reshape(1, -1)])
                # Extrayez la valeur scalaire à partir du tableau numpy
                distance_score = distance_scores[0][0]  # Ici, nous prenons le premier élément du premier tableau
                similarity_scores.append((i, distance_score))

        # Triez les utilisateurs en fonction de leurs scores de similarité (du plus similaire au moins similaire)
        similarity_scores.sort(key=lambda x: x[1])

        # Obtenez les indices des utilisateurs recommandés
        recommended_user_indices = [i for i, _ in similarity_scores]

        # Recommandez les 10 meilleurs utilisateurs similaires (en utilisant les noms d'utilisateurs)
        top_10_recommended_users = [user_names[i] for i in recommended_user_indices[:5]]

        return jsonify({'top_10_recommended_users': top_10_recommended_users})
    else:
        # Gérez le cas où l'utilisateur n'a pas été trouvé
        return jsonify({'error': 'L\'utilisateur n\'a pas été trouvé'})


if __name__ == '__main__':
    app.run(debug=True,port=3009)