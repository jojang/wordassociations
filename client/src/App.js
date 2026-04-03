import './App.css';
import { useState, useEffect } from "react";
import Modal from './components/Modal';
import End from './components/End';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Switch from '@mui/material/Switch';

const randomWords = require('random-words');

function App() {
  const [guess, setGuess] = useState("");
  const [generate, setGenerate] = useState(randomWords({ exactly: 1 })[0]);
  const [score, setScore] = useState(0);
  const [wordlist, setWordlist] = useState([]);
  const [scorelist, setScorelist] = useState();
  const [strikes, setStrikes] = useState(3);
  const [openModal, setOpenModal] = useState(false);
  const [openEndModal, setOpenendmodal] = useState(false);
  const [start, setStart] = useState(true);
  const [finalScore, setFinalscore] = useState(0);
  const [result, setResult] = useState("");
  const [darkMode, setDarkmode] = useState(false);
  const [inputState, setInputState] = useState("");

  const darkTheme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
  });

  const options = {
    method: 'GET',
    headers: {
      'X-RapidAPI-Host': 'twinword-word-associations-v1.p.rapidapi.com',
      'X-RapidAPI-Key': process.env.REACT_APP_RAPIDAPI_KEY
    }
  };

  useEffect(() => {
    if (result === 'Entry word not found') {
      changeWord();
      fetchdata();
      setResult("");
    } else {
      fetchdata();
    }
  }, [generate, result]);

  useEffect(() => {
    if (strikes === 0) {
      setFinalscore(score);
      setScore(0);
      setStrikes(3);
      setOpenendmodal(true);
      changeWord();
    }
  }, [strikes, start, score, generate]);

  function fetchdata() {
    fetch(`https://twinword-word-associations-v1.p.rapidapi.com/associations/?entry=${generate}`, options)
      .then(response => response.json())
      .then(response => {
        setWordlist(response.associations_array);
        setScorelist(response.associations_scored);
        setResult(response.result_msg);
      })
      .catch(err => console.error(err));
  }

  const flashInput = (state) => {
    setInputState(state);
    setTimeout(() => setInputState(""), 500);
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      if (guess === "") {
        flashInput("error");
      } else if (wordlist.includes(guess)) {
        flashInput("correct");
        setScore(score + Math.round(scorelist[guess] * 10000));
        setGuess("");
        setStrikes(3);
        changeWord();
      } else {
        flashInput("error");
        setStrikes(strikes - 1);
        setGuess("");
      }
    }
  };

  const changeWord = () => {
    setGenerate(randomWords({ exactly: 1, min: 3 })[0]);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        {openModal && <Modal closeModal={setOpenModal} />}
        {openEndModal && <End closeEndModal={setOpenendmodal} finalscore={finalScore} />}

        <div className='titleContainer'>
          <div className="title">Word Associations</div>
          <div className='options'>
            <Switch
              checked={darkMode}
              onChange={() => setDarkmode(!darkMode)}
              sx={{ marginLeft: "" }}
            />
            <button
              className='openModalBtn'
              onClick={() => setOpenModal(true)}>
              ?
            </button>
          </div>
        </div>

        <hr />

        <div id="title_container">
          <div id="score">SCORE: {score}</div>
          <div id="strikes">LIVES: {strikes}</div>
        </div>

        {!start && <div className='word'>{generate}</div>}

        <input
          value={guess}
          id="user_guess"
          className={inputState}
          type="text"
          placeholder={start ? "" : "Enter word here..."}
          onKeyDown={handleKeyPress}
          onChange={(event) => setGuess(event.target.value)}
        /><br />

        {start && (
          <button
            className='start'
            id='begin'
            onClick={() => setStart(false)}
          >
            START
          </button>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
