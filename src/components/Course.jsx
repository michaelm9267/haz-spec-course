import React, {useState} from 'react'
import '../Styles/course.css'
import './courseSlides/IntroductionSlide'
import IntroductionSlide from './courseSlides/IntroductionSlide'
import PackagingHierarchy from './courseSlides/PackagingHierarchy'
import Disclaimer from './courseSlides/Disclaimer'
import Definitions from './courseSlides/Definitions'
import TypesOfPackages from './courseSlides/TypesOfPackages'

const Course = () => {
const [currentSlide, setCurrentSlide] = useState(4);

const slides = [
    {id: 1, slide: <IntroductionSlide />},
    {id: 2, slide: <PackagingHierarchy />},
    {id: 3, slide: <Disclaimer />},
    {id: 4, slide: <Definitions />},
    {id: 4, slide: <TypesOfPackages />},
    
];

const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
        setCurrentSlide(currentSlide + 1);
    }
}

const handlePreviousSlide = () => {
    if (currentSlide > 0) {
        setCurrentSlide(currentSlide - 1);
    }
}



  return (
    <div className='slide-cont'>
                <button className='prev' onClick={handlePreviousSlide}></button>
        <div className='course-cont'>
            <div className='buttons'>
            </div>
          {slides[currentSlide].slide}
        </div>
             <button className='next'  onClick={handleNextSlide}></button>
    </div>
  )
}

export default Course