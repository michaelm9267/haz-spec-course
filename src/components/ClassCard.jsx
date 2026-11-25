import React from "react";
import { assetUrl, getHazardClass } from "../utils/hazard";

const ClassCard = ({ code }) => {
  const info = getHazardClass(code);
  return (
    <div className="class-card">
      {info?.LabelImage && <img src={assetUrl(info.LabelImage)} alt={`${info.Label} label`} />}
      <div>
        <div className="class-code">{code}</div>
        {info && <div>{info.Name}</div>}
      </div>
    </div>
  );
};

export default ClassCard;
