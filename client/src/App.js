import './App.css';
import { useState, useEffect } from "react"; 
import Modal from './components/Modal';
import End from './components/End';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Switch from '@mui/material/Switch';


function App() {
  const randomWords = require('random-words');
  const[guess, setGuess] = useState("");
  const[generate, setGenerate] = useState(randomWords({ exactly: 1 })[0]);
  const[score, setScore] = useState(0);
  const[wordlist, setWordlist] = useState([]);
  const[scorelist, setScorelist] = useState();
  const[strikes, setStrikes] = useState(3);
  const[openModal, setOpenModal] = useState(false);
  const[openEndModal, setOpenendmodal] = useState(false);
  const[start, setStart] = useState(true);
  const[placeholder, setPlaceholder] = useState("");
  const[finalScore, setFinalscore] = useState(0);
  const[result, setResult] = useState("");
  const[darkMode, setDarkmode] = useState(false);

  const darkTheme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
    },
  });

  let element = document.getElementById('user_guess');

  const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Host': 'twinword-word-associations-v1.p.rapidapi.com',
        'X-RapidAPI-Key': 'fdce1536aemshaf128813192334fp19b7f9jsn36ceeb410c9f'
      }
  }

  useEffect(() => {

    if(result === 'Entry word not found'){
      changeWord()
      fetchdata();  
      setResult("")
    }
    else{
      document.getElementById("currWord").innerHTML = generate; 
      fetchdata();  
      console.log(generate)
    }
  },[generate, result, changeWord, fetchdata])

  useEffect(() => {

    if(strikes === 0){
      document.getElementById('user_guess').disabled = true;
      setFinalscore(score)
      setScore(0)
      setStrikes(3)
      setOpenendmodal(true)
      changeWord()
      document.getElementById("currWord").innerHTML = generate; 
      document.getElementById('user_guess').disabled = false;
    }
  }, [strikes, start, generate])



  function fetchdata(){

    fetch(`https://twinword-word-associations-v1.p.rapidapi.com/associations/?entry=${generate}`, options)
      .then(response => response.json())
      .then(response => {
        setWordlist(response.associations_array)
        setScorelist(response.associations_scored)
        setResult(response.result_msg)
      })
      .catch(err => console.error(err));
    }
  
  const start_game = () => {
    setStart(false);
    setPlaceholder('Enter word here...');
  }


  const addError = () => {
    element.classList.add('error');
  }
  const removeError = () => {
    element.classList.remove('error');
  }
  const addCorrect = () => {
    element.classList.add('correct');
  }
  const removeCorrect = () => {
    element.classList.remove('correct');
  }


  const handleKeyPress = (event) => {
    if(event.key === "Enter") {
      if(guess === ""){
        addError();
        setTimeout(removeError, 500);
      }
      else{
        if(wordlist.includes(guess)){
          addCorrect();
          setTimeout(removeCorrect, 500);
          setScore(score + Math.round(scorelist[guess] * 10000));
          reset();
          setStrikes(3);
          changeWord();
        }
        else{
            
            addError();
            setTimeout(removeError, 500);
            setStrikes(strikes - 1);
            reset();
        }
      }
    }
  }

  const reset = () => {
    setGuess("");
  }

  const changeWord = () => {
    setGenerate(randomWords({ exactly: 1, min: 3 })[0]);
  }
  
  function hide() {
    document.querySelector(".word").style.display = "block";
    let x = document.getElementById("begin");
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  function show() {
    let y = document.getElementById("user_guess");
    if(darkMode === true){
      y.style.color = "black";
    }
    else if(darkMode === false){
      y.style.color = "white";
    }
  }


  return (
  <ThemeProvider theme={darkTheme}>  
    <CssBaseline />
    <div className="App">
      {openModal && <Modal closeModal={setOpenModal} />}
      {openEndModal && <End closeEndModal={setOpenendmodal} finalscore={finalScore} />}
      <div className="title">
        Word Associations
        <Switch 
          checked={darkMode} 
          onChange={() => { setDarkmode(!darkMode); show() }} 
          sx={{ marginLeft:"507px"}}/>
        <button 
          className='openModalBtn' 
          onClick={() => {
          setOpenModal(true);
          }}>
          ?
        </button>
      </div>
      <hr></hr>

      <div id="title_container">
        <div id="score">SCORE: {score}</div>  
        <div id="strikes">LIVES: {strikes}</div>
      </div>

      <div className='word' id='currWord' onChange={changeWord}></div>
      
      <input 
        value={guess}
        id="user_guess"
        type="text" 
        placeholder={placeholder} 
        onKeyDown={handleKeyPress}
        onChange={(event) => {
        setGuess(event.target.value);
      }}>
      </input><br></br>
      <button 
      className='start'
      id='begin'
      onClick={() => {
        start_game();
        hide();
     }}
      >
        START
      </button>



    </div>
  </ThemeProvider>  
  );
}

export default App;
