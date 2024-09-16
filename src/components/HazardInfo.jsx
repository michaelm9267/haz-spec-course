import React from "react";
import SP from "../data-file/special-provisions.json";
import HC from "../data-file/hazardClasses.json";
import "../Styles/hazardInfo.css";

const HazardInfo = ({ selectedItem }) => {
  if (!selectedItem) {
    return null;
  }

  // Destructure properties from selectedItem
  const {
    UN,
    PSN,
    TN,
    Class: hazardClass,
    SubClass: subsidiaryClass,
    PG: packingGroup,
    SpecProv: specialProvisions,
    PackingPara,
  } = selectedItem;

  // Function to get hazard class info based on the division
  const getHazardClassInfo = (classCode) => {
    // Extract the first three characters to get the division part (e.g., "1.1" from "1.1B")
    const division = classCode.slice(0, 3);
    return HC.HazardClasses.find((hc) => hc.Class === division);
  };

  // Get main hazard class info based on division
  const hazardClassInfo = getHazardClassInfo(hazardClass);

  // Get subsidiary hazard class info if it exists
  const subsidiaryClassInfo = subsidiaryClass
    ? getHazardClassInfo(subsidiaryClass)
    : null;

  // Process special provisions
  let specialProvisionsDetails = [];
  if (specialProvisions) {
    // Remove any whitespace and split the provisions into an array
    const provisionsArray = specialProvisions.replace(/\s/g, "").split(",");

    specialProvisionsDetails = provisionsArray.map((code) => {
      // Find the provision in the special provisions data
      const provisionDetail = SP.P.find((p) => p.provision === code);

      return {
        code,
        details: provisionDetail ? provisionDetail.details : "No details available.",
      };
    });
  }

  return (
    <div className="hazard-info">
      <h2>Hazard Information</h2>
      <div className="hazard-details">
      <p>
        <strong>UN Number:</strong> {UN}
      </p>
      <p>
        <strong>Proper Shipping Name:</strong> {PSN}
      </p>
      <p>
        <strong>Technical Name:</strong> {TN ? "Technical Name is Required" : "No Technical Name Required"}
      </p>
      <p>
        <strong>Packing Group:</strong> {packingGroup || "Not specified"}
      </p>

      {/* Hazard Class Information */}
      {hazardClass && (
        <>
          <h3>Hazard Class</h3>
          <p>
            <strong>Class:</strong> {hazardClass}
          </p>
          {hazardClassInfo && (
            <>
              <p>
                <strong>Name:</strong> {hazardClassInfo.Name}
              </p>
              {hazardClassInfo.LabelImage && (
                <img
                  src={hazardClassInfo.LabelImage}
                  alt={hazardClassInfo.Label}
                />
              )}
            </>
          )}
        </>
      )}

      {/* Subsidiary Hazard Class Information */}
      {subsidiaryClass && (
        <>
          <h3>Subsidiary Hazard Class</h3>
          <p>
            <strong>Class:</strong> {subsidiaryClass}
          </p>
          {subsidiaryClassInfo && (
            <>
              <p>
                <strong>Name:</strong> {subsidiaryClassInfo.Name}
              </p>
              {subsidiaryClassInfo.LabelImage && (
                <img
                  src={subsidiaryClassInfo.LabelImage}
                  alt={subsidiaryClassInfo.Label}
                />
              )}
            </>
          )}
        </>
      )}

{/* Special Provisions */}
{specialProvisionsDetails.length > 0 && (
  <div >
    <h3>Special Provisions</h3>
    <ul className="prov-cont">
      {specialProvisionsDetails.map((sp, index) => {
        const cargoAcftOnly =
          sp.code === "P1" || sp.code === "P2" || sp.code === "P3" || sp.code === "P4"
            ? "images/Cargo Aircraft Only.png"
            : null;
        return (
          <li key={index} >
            <strong>{sp.code}:</strong> {sp.details}
            {cargoAcftOnly && (
              <img
                src={cargoAcftOnly}
                alt="Cargo Aircraft Only"
                id="cao"
              />
            )}
          </li>
        );
      })}
    </ul>
  </div>
)}


      <p>
        <strong>Packaging Paragraph:</strong> {PackingPara || "Not specified"}
      </p>
      </div>
    </div>
  );
};

export default HazardInfo;
