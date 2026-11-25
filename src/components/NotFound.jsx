import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="not-found">
    <h2>Page not found</h2>
    <p>
      <Link to="/">Back to the tables</Link>
    </p>
  </div>
);

export default NotFound;
