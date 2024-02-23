import * as React from "react";
import * as ReactDOM from "react-dom/client";

function App() {
  return <div style={{color: "blue", fontSize: 60}}>Hello World from React + RSPack!!</div>;
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(<App />);