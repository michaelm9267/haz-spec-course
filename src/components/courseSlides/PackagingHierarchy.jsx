import React from 'react'

const Slide1 = () => {
    return (
        <div>
            <h1>Packaging Hierarchy</h1>
            <hr />
            
            <div className='hierarchy'>
             
                <ul>
                    <li>Identify The Hazard</li>
                    <ul>
                        <li>Determine the Class/Division based on physical and chemical Properties.</li>
                        <li>Reference the Material in Table A4.1.</li>
                        <li>Verify the UN Number and The Proper Shipping Name.</li>
                    </ul>
                    <li>Determine the level of packaging required</li>
                    <ul>
                        <li>What is the qantity of the material?</li>
                        <li>what type of packing material is needed?</li>
                        <li>What mode of transport will it be going?</li>
                    </ul>
                    <li>Determine Markings and Lables that are required.</li>
                    <li>Correctly fill out the correct Documentation</li>
                    <li>Inspect the package for errors</li>
                    <ul>
                        <li>Have a another qualified individual Inspect the package and paperwork for errors. </li>
                    </ul>
                </ul>
                   <img src='/images/identifing Hazard.png' alt='identifying hazard' />
            </div>

            <h2 style={{textAlign: 'center'}}>Always Identify your Hazard!</h2>
    
       
        </div>
      )
    }


export default Slide1