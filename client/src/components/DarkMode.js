import React from "react";
import "./DarkMode.css";

const DarkMode = () => {

    let clicked = "clicked";
    const body = document.body;
    const light = "light";
    const dark = "dark";
    let theme;

    if (localStorage) {
        theme = localStorage.getItem("theme");
    }

    if (theme === light || theme === dark) {
        body.classList.add(theme);
    } else{
        body.classList.add(light)
    }

    const switchTheme = (e) => {
        if (theme === dark) {
            body.classList.replace(dark, light);   
            e.target.classList.remove(clicked);
            localStorage.setItem("theme", "light");
            theme = light; 
        } else{
            body.classList.replace(light, dark);
            e.target.classList.add(clicked);
            localStorage.setItem("theme", "dark");
            theme = dark;
        }
    }

    return (
        <button className={theme === "dark" ? clicked : ""} id="darkMode" onClick={(e) => switchTheme(e)}>

        </button>
    );
};

export default DarkMode;