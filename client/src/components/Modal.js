import React from 'react';
import "./Modal.css";
import DarkMode from './DarkMode';

function Modal( { closeModal } ){
    return(
        <div className='modalBackground'>
            <div className='modalContainer'>
                <div className='modalTitle'>
                    <h2>HOW TO PLAY WORD ASSOCIATIONS</h2>
                </div>
                <div className='rules'>
                    <h4>Find a one word association for the starting word </h4>
                    <h4>Stronger Association = Higher Score </h4>
                    <h4> 3 strikes</h4>
                    <h4> Strikes reset after correct association</h4>
                </div>
                <button className='close' onClick={() => closeModal(false)}>BACK TO GAME</button>
            </div>
        </div>
    )
}

export default Modal