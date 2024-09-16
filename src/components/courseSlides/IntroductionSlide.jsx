import React from 'react'

const IntroductionSlide = () => {
  return (
    <div>
        <h1>Welcome to Hazmat Specialist Course</h1>
        <hr />
       <h3>Overview</h3>
        <div className='overview'>
         
            <ul>
                <li>Disclaimer</li>
                <li>Packaging Hierarchy</li>
                <li>Important Definitions</li>
                <li>Chapter 3 Movement</li>
                <li>Types of Packaging</li>
                <li>Item Table</li>
                <li>Special Provisions</li>
                <li>Hazardous Substances</li>
                <li>Excepted Quantities</li>
                <li>Limited Quantities</li>
                <li>Marking</li>
                <li>Labeling</li>
                <li>Compatabilitie</li>
                <li>Certifying</li>
                <li>Questions</li>
            </ul>
            <img src='/images/hazphoto.png' alt='hazmat' />
        </div>

        <div className='objective'>
            <p ><strong>Objective:</strong><hr /> By the end of this course, given a copy of the DAFMAN 24-604, students should be able to complete a 15 question test and achied an 80%, with no instructor assist.</p>
            
        </div>
    </div>
  )
}

export default IntroductionSlide