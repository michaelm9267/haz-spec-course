import React from "react";
import { assetUrl } from "../../utils/hazard";

const TOPICS = [
  "Disclaimer",
  "Packaging Hierarchy",
  "Important Definitions",
  "Chapter 3 Movement",
  "Types of Packaging",
  "Item Table",
  "Special Provisions",
  "Hazardous Substances",
  "Excepted Quantities",
  "Limited Quantities",
  "Marking",
  "Labeling",
  "Compatibility",
  "Certifying",
  "Questions",
];

const IntroductionSlide = () => (
  <div>
    <h1>Welcome to the Hazmat Specialist Course</h1>
    <hr />
    <div className="two-col">
      <div>
        <h3>Overview</h3>
        <ul className="topic-list">
          {TOPICS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <img src={assetUrl("images/hazphoto.png")} alt="Hazardous materials packages" />
    </div>

    <div className="callout">
      <strong>Objective:</strong> By the end of this course, given a copy of DAFMAN 24-604,
      students should be able to complete a 15-question test and achieve 80% with no instructor
      assistance.
    </div>
  </div>
);

export default IntroductionSlide;
