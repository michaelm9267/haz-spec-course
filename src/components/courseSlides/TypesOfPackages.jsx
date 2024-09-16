import React from 'react'

const TypesOfPackages = () => {
  return (
    <div>
    <div>
      <h1>Types of Packages</h1>
      <hr />
      <div className='types-of-packages'>
        <img className='cb-image' tyle={{gridRow: "1/2", gridColumn: "1/2"}} src="images/CombinationPackaging.png" alt="Combination Packaging" />
        <ul className='cb-list' style={{gridRow: "2/3"}}>
        <h4>Combination Packages</h4>
            <li>A combination package could contain more than one hazardous material, each securely packed in inner containers to prevent leaks.</li>
            <li>The inner containers are placed inside a durable outer packaging to provide additional protection during handling and transport.</li>
            <li>The materials in the inner containers must be compatible to prevent any dangerous reactions or leaks during transport.</li>
        </ul>
        <img className='sing-image' style={{gridRow: "1/2", gridColumn: "2/3"}}  src="images/SinglePackage.png" alt="Combination Packaging" />
        <ul className='sing-list' style={{gridRow: "2/3"}}>
        <h4>Single Packages</h4>
            <li>A single package contains only one hazardous material, packed directly within the primary packaging.

</li>
            <li>Unlike combination packages, single packages do not have inner containers, relying solely on the outer packaging for protection.</li>
            <li>The single package must meet specific regulatory standards to ensure safe handling, storage, and transport of hazardous materials.</li>
        </ul>
        <img className='comp-image' style={{gridRow: "1/2", gridColumn: "3/4"}} src="images/CompPackage.png" alt="Combination Packaging" />
        <ul className='comp-list' style={{gridRow: "2/3"}}>
        <h4>Composite Packages</h4>
            <li>A composite package consists of an inner receptacle and an outer packaging that form a single integrated unit.</li>
            <li>The inner and outer packaging cannot be separated without damaging the package, ensuring they function as one during transport.</li>
            <li>The inner receptacle and outer packaging must be compatible with the hazardous material to prevent leaks or reactions.</li>
        </ul>

      </div>

  </div>
  </div>
  )
}

export default TypesOfPackages