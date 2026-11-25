import React from "react";
import Header from "../components/Header";

const Layout = ({ children }) => (
  <div className="app">
    <Header />
    <main className="main">{children}</main>
  </div>
);

export default Layout;
