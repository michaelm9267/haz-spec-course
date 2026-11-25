import React, { useCallback, useEffect, useState } from "react";
import "../Styles/course.css";
import IntroductionSlide from "./courseSlides/IntroductionSlide";
import PackagingHierarchy from "./courseSlides/PackagingHierarchy";
import Disclaimer from "./courseSlides/Disclaimer";
import Definitions from "./courseSlides/Definitions";
import TypesOfPackages from "./courseSlides/TypesOfPackages";

const SLIDES = [
  { title: "Introduction", Component: IntroductionSlide },
  { title: "Disclaimer", Component: Disclaimer },
  { title: "Packaging Hierarchy", Component: PackagingHierarchy },
  { title: "Definitions", Component: Definitions },
  { title: "Types of Packages", Component: TypesOfPackages },
];

const Course = () => {
  const [current, setCurrent] = useState(0);
  const last = SLIDES.length - 1;

  const goTo = useCallback(
    (index) => setCurrent(Math.min(Math.max(index, 0), last)),
    [last]
  );

  // Arrow keys move between slides (ignored while typing in an input).
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") goTo(current + 1);
      if (e.key === "ArrowLeft") goTo(current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, goTo]);

  const { Component } = SLIDES[current];

  return (
    <div className="course">
      <div className="slide">
        <Component />
      </div>

      <div className="slide-nav">
        <button onClick={() => goTo(current - 1)} disabled={current === 0}>
          ← Previous
        </button>
        <div className="slide-dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              className={`dot${i === current ? " active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              aria-current={i === current ? "step" : undefined}
            />
          ))}
          <span className="slide-count">
            {current + 1} / {SLIDES.length}
          </span>
        </div>
        <button onClick={() => goTo(current + 1)} disabled={current === last}>
          Next →
        </button>
      </div>
    </div>
  );
};

export default Course;
