import React from 'react';
import "./End.css";

function End( { closeEndModal, finalscore} ){
    
    return(
        <div className='modalBackground2'>
            <div className='modalContainer2'>
                <div className='modalTitle2'>
                    <h2>GAME OVER</h2>
                </div>
                <div className='scoreHeader'>
                    <h3>FINAL SCORE</h3>
                </div>
                <div className='scoreDisplay'>
                    <h3>{finalscore}</h3>
                </div>
                <button className='close2' onClick={() => closeEndModal(false) }>PLAY AGAIN?</button>
            </div>
        </div>
    )
}

export default End