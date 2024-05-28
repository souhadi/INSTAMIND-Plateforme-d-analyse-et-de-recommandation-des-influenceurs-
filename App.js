import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import DataTable from 'react-data-table-component';
import './App.css';
import backgroundImage from './1029512.jpg'; // Ajustez le chemin pour correspondre à votre structure de dossier
import axios from 'axios';
import ReactModal from 'react-modal';

const customStyles = {
  headRow: {
    style: {
      backgroundColor: '#DCDCDC',
      color: 'black',
    },
  },
  headCells: {
    style: {
      fontSize: '16px',
      fontWeight: '600',
      textTransform: 'uppercase',
    },
  },
  cells: {
    style: {
      fontSize: '15px',
    },
  },
};
ReactModal.setAppElement('#root'); // Assurez-vous d'ajuster le sélecteur selon la structure de votre application

function App() {
  const [lastRowId, setLastRowId] = useState(null);
  const [firstRowIndex, setFirstRowIndex] = useState(0);
  const [topInfluencers, setTopInfluencers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleData, setVisibleData] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // État pour le terme de recherche
  const [searchResults, setSearchResults] = useState([]); // État pour les résultats de recherche
  const [itemsPerPage] = useState(10);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(''); // État pour la liste déroulante
  const [filteredByTopic, setFilteredByTopic] = useState([]); // État pour les résultats filtrés par topic
  const [generatedBio, setGeneratedBio] = useState('');
  const [GeneratedSimilar, setGeneratedSimilar] = useState('');
  const [isBioModalOpen, setBioModalOpen] = useState(false);
  const [isSimilarModalOpen, setSimilarModalOpen] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(null);
  const [selectedUserData, setSelectedUserData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/top_5000_influencers.csv');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const csvData = await response.text();

        const parseData = Papa.parse(csvData, {
          header: true,
          skipEmptyLines: true,
        });

        setTopInfluencers(parseData.data);

        // Populate the visibleData state with the initial 20 items
        setVisibleData(parseData.data.slice(0, itemsPerPage));
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  function formatFollowers(followers) {

    if (followers >= 1000000) {
      return (followers / 1000000).toFixed(1) + 'M';
    } else if (followers >= 1000) {
      return (followers / 1000).toFixed(1) + 'K';
    } else {
      return followers.toString();
    }
  }
  

  // Calculate total pages based on itemsPerPage
  const totalPages = Math.ceil(topInfluencers.length / itemsPerPage);

  const nextPage = async () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);

      // Mettez à jour l'index de la première ligne pour la nouvelle page
      setFirstRowIndex(currentPage * itemsPerPage);

      // Calculate the start and end index for the next page
      const startIndex = currentPage * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      // Check if we need to load more data from the CSV
      if (endIndex > topInfluencers.length) {
        try {
          const response = await fetch('/top_5000_influencers.csv');
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }

          const csvData = await response.text();
          const parseData = Papa.parse(csvData, {
            header: true,
            skipEmptyLines: true,
          });

          // Add the newly loaded data to the existing data
          setTopInfluencers([...topInfluencers, ...parseData.data]);
        } catch (error) {
          console.error('Error fetching more data:', error);
        }
      }

      // Determine which rows to add to visibleData
      const rowsToAdd = topInfluencers.slice(startIndex, endIndex);

      // Update visibleData by concatenating the new rows
      setVisibleData((prevData) => [...prevData, ...rowsToAdd]);
    }
  };

  const searchUser = () => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const filteredResults = topInfluencers.filter((user) =>
      user.user_name.toLowerCase().includes(lowerCaseSearchTerm)
    );

    if (filteredResults.length === 0 && searchTerm !== '') {
      const partialMatchResults = topInfluencers.filter((user) =>
        user.user_name.toLowerCase().includes(lowerCaseSearchTerm)
      );

      if (partialMatchResults.length > 0) {
        setSearchSuggestions(partialMatchResults.map((user) => user.user_name));
      } else {
        // Si aucune correspondance partielle n'est trouvée, réinitialisez les suggestions
        setSearchSuggestions([]);
      }
    } else {
      setSearchSuggestions([]);
    }

    setSearchResults(filteredResults);
  };

  // Définissez la liste de mots pour la liste déroulante
  const dropdownOptions = [
    'Travel', 'Tourism', 'Cuisine', 'Food', 'Art', 'Creativity', 'Family', 'Health',
    'Fashion', 'Beauty', 'Education', 'Entertainment', 'Sports', 'Business', 'Animals',
    'Nature', 'Technology', 'Social Media', 'Events', 'Celebrations', 'Photography',
    'Lifestyle', 'Culture', 'Influencers', 'Entrepreneurship', 'LifeStyle', 'Competition',
    'Music', 'Leisure', 'Pets', 'Dance', 'Style', 'Fitness', 'Comedy', 'Cinema', 'Religion',
    'Online Content', 'Finance',
  ];

  const handleDropdownChange = (event) => {
    const selected = event.target.value;
    setSelectedOption(selected);
  
    // Filtrer les résultats en fonction de l'item sélectionné
    if (selected === '') {
      setFilteredByTopic([]);
    } else {
      const filteredResults = topInfluencers.filter((user) =>
        user.Topic.includes(selected)
      );
      setFilteredByTopic(filteredResults);

    }
  };
  const handleUserClick = (e, username, index) => {
    e.preventDefault();
  
    console.log(`Cliquez sur l'utilisateur : ${username}`);
    setSelectedUserIndex(index);
    setBioModalOpen(true);
  
    // Effectuez un appel à votre API Flask pour obtenir la biographie en utilisant Axios
    axios.post(`http://localhost:3007/generate_bio`, { user_name: username }, { withCredentials: true })
      .then((response) => {
        if (response.data.bio) {
          setSelectedUserData(response.data);  // Set the selectedUserData state
        } else {
          console.error("Erreur : la biographie n'a pas été générée.");
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération de la biographie ', error);
      });
  };
  
  
  const handleSimilarClick = (e, acountname) => {
    e.preventDefault();
    console.log(`Cliquez sur l'utilisateur : ${acountname}`);
    setSimilarModalOpen(true);
    // Effectuez un appel à votre API Flask pour obtenir la biographie en utilisant Axios
    axios.post(`http://localhost:3009/find_similar_users`, { acount_name: acountname }, { withCredentials: true })
      .then((response) => {
        if (response.data.top_10_recommended_users) {
          setGeneratedSimilar(response.data.top_10_recommended_users);
        } else {
          alert("Erreur : similar non générée");
        }
      })
      .catch((error) => {
        console.error('Erreur lors de la récupération de similar ', error);
      });
  };
  

  // Define columns for the DataTable
  const columns = [
    {
      name: '# Index',
      cell: (row, index) => (
        <div style={{ paddingLeft: '5px', margin: 0 }}>{index + 1}</div>
      ),
    },

    {
      name: 'Username',
      cell: (row,index) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'left' }}>
            <div style={{ marginRight: '5px' }}>
              <img
                src={row.image}
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            </div>
            <div>
              <div>{row.user_name}</div>
              <div>
                <a
                  href={`https://example.com/${row.acount_name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    handleUserClick(e, row.user_name,index)
                    handleSimilarClick(e,row.acount_name)
                  }} // Utilisez une fonction pour gérer le clic
                >
                  {row.acount_name}
                </a>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      name: 'Followers',
      selector: 'followers',
      cell: (row) => formatFollowers(row.followers),
    },
    {
      name: 'Engagement Rate',
      selector: 'taux_engagement',
    },
    {
      name: 'Topics',
      selector: 'Topic',
      cell: (row) => (
        <div>
          {row.Topic.split(', ').map((topic, index) => (
            <span key={index}>{topic}</span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div
      className="App"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div style={{ backgroundColor: 'white' }}>
        <div style={{ backgroundColor: 'white' }}>
          <img
            src={process.env.PUBLIC_URL + '/medianet.png'}
            style={{ width: '300px', height: 'auto', marginRight: '10px' }}
          />
          <img
            src={process.env.PUBLIC_URL + '/enetcom.jpg'}
            style={{ width: '200px', height: 'auto' }}
          />
        </div>
      </div>

      <div
        style={{
          color: 'white',
          textAlign: 'center',
          padding: '2px 5%',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '80px' }}>
          <b>Top 5000 Instagram Influencers in the World</b>
        </h1>
      </div>
      <ReactModal
  isOpen={isBioModalOpen || isSimilarModalOpen}
  onRequestClose={() => {
    setBioModalOpen(false);
    setSimilarModalOpen(false);
  }}
  contentLabel="Combined Modal"
  style={{
    content: {
      width: '600px', // Ajustez cette valeur selon vos besoins
      margin: '0 auto',
      padding: '20px',
      backgroundColor: '#f0f0f0',
      textAlign: 'center',
    },
  }}
>
{isBioModalOpen && selectedUserData && (
    <div>
      <img
        src={topInfluencers[selectedUserIndex].image}
        alt="User Profile"
        style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', marginBottom: '10px' }}
      />
      <h2>{topInfluencers[selectedUserIndex].user_name}</h2>
      <p>{selectedUserData.bio}</p>
    </div>
  )}

  {isSimilarModalOpen &&  (
    <div>
    
      <h3>Listen to another account that is similar</h3>
      <p>{GeneratedSimilar}</p>
    </div>
  )}
</ReactModal>
      <div style={{ padding: '140px 5%' }}>
        <input
          type="text"
          placeholder="Username"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '600px',
            height: '50px',
            border: '1px solid #ccc',
            fontSize: '14px',
            outline: '1px solid white',
          }}
        />
        <button
          onClick={searchUser}
          style={{
            width: '100px',
            height: '53px',
            border: '1px solid #ccc',
            fontSize: '14px',
            outline: '1px solid white',
          }}
        >
          Search
        </button>

        {searchSuggestions.length > 0 && (
          <ul>
            {searchSuggestions.map((suggestion, index) => (
              <li key={index} onClick={() => setSearchTerm(suggestion)}>
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>


      <div style={{ padding: '10px 5%', display: 'flex', alignItems: 'center' }}>
        <label style={{ marginRight: '10px', fontWeight: 'bold', color: "white", fontSize: '20px' }}><b>Topics</b></label>
        <select
          value={selectedOption}
          onChange={handleDropdownChange}
          style={{
            width: '300px',
            height: '30px',
            fontSize: '14px',
            border: '1px solid #ccc',
            outline: '1px solid white',
            backgroundColor: '#f4f4f4', // Couleur de fond
            color: '#333', // Couleur du texte
            borderRadius: '5px', // Coins arrondis
          }}
        >
          <option value="">All options</option>
          {dropdownOptions.map((option, index) => (
            <option key={index} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {(filteredByTopic.length > 0 || searchResults.length > 0) ? (
        <div style={{ padding: '5px 5%' }}>
          {/* Utilisez DataTable avec les résultats filtrés */}
          <DataTable
            columns={columns}
            data={filteredByTopic.length > 0 ? filteredByTopic : searchResults}
            noHeader // Supprimer l'en-tête du tableau
            customStyles={customStyles}
          />
        </div>
      ) : null}
     
      {visibleData.length && searchResults.length === 0 && filteredByTopic.length === 0 ? (
        <div style={{ padding: '10px 5%' }}>
          <DataTable
            columns={columns}
            data={visibleData}
            noHeader
            customStyles={customStyles}
          />
          <div>
            <button
              onClick={nextPage}
              disabled={currentPage === totalPages}
              style={{
                backgroundColor: '#A9A9A9',
                color: 'white',
                fontSize: '18px',
                padding: '10px 20px',
                border: 'none',
                cursor: 'pointer',
                width: '1080px',
              }}
            >
              View More
            </button>
          </div>
        </div>
      ) : null}

    </div>
    
  );
}

export default App;


