import React from "react";
import { assetUrl } from "../../utils/hazard";

const PackagingHierarchy = () => (
  <div>
    <h1>Packaging Hierarchy</h1>
    <hr />
    <div className="two-col">
      <ol className="hierarchy">
        <li>
          Identify the hazard
          <ul>
            <li>Determine the class/division based on physical and chemical properties.</li>
            <li>Reference the material in Table A4.1.</li>
            <li>Verify the UN number and the proper shipping name.</li>
          </ul>
        </li>
        <li>
          Determine the level of packaging required
          <ul>
            <li>What is the quantity of the material?</li>
            <li>What type of packing material is needed?</li>
            <li>What mode of transport will it be going by?</li>
          </ul>
        </li>
        <li>Determine the markings and labels that are required.</li>
        <li>Correctly fill out the required documentation.</li>
        <li>
          Inspect the package for errors
          <ul>
            <li>Have another qualified individual inspect the package and paperwork for errors.</li>
          </ul>
        </li>
      </ol>
      <img src={assetUrl("images/identifing Hazard.png")} alt="Identifying the hazard" />
    </div>

    <h2 className="slide-tagline">Always identify your hazard!</h2>
  </div>
);

export default PackagingHierarchy;
