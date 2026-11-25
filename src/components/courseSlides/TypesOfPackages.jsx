import React from "react";
import { assetUrl } from "../../utils/hazard";

const PACKAGE_TYPES = [
  {
    title: "Combination Packages",
    image: "images/CombinationPackaging.png",
    points: [
      "A combination package could contain more than one hazardous material, each securely packed in inner containers to prevent leaks.",
      "The inner containers are placed inside a durable outer packaging to provide additional protection during handling and transport.",
      "The materials in the inner containers must be compatible to prevent any dangerous reactions or leaks during transport.",
    ],
  },
  {
    title: "Single Packages",
    image: "images/SinglePackage.png",
    points: [
      "A single package contains only one hazardous material, packed directly within the primary packaging.",
      "Unlike combination packages, single packages do not have inner containers, relying solely on the outer packaging for protection.",
      "The single package must meet specific regulatory standards to ensure safe handling, storage, and transport of hazardous materials.",
    ],
  },
  {
    title: "Composite Packages",
    image: "images/CompPackage.png",
    points: [
      "A composite package consists of an inner receptacle and an outer packaging that form a single integrated unit.",
      "The inner and outer packaging cannot be separated without damaging the package, ensuring they function as one during transport.",
      "The inner receptacle and outer packaging must be compatible with the hazardous material to prevent leaks or reactions.",
    ],
  },
];

const TypesOfPackages = () => (
  <div>
    <h1>Types of Packages</h1>
    <hr />
    <div className="package-types">
      {PACKAGE_TYPES.map(({ title, image, points }) => (
        <section key={title} className="package-type">
          <img src={assetUrl(image)} alt={title} />
          <h3>{title}</h3>
          <ul>
            {points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  </div>
);

export default TypesOfPackages;
