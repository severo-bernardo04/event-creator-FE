"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const images = [
  { src: "/images/slide1.jpg", alt: "Slide 1" },
  { src: "/images/slide2.jpg", alt: "Slide 2" },
  { src: "/images/slide3.jpg", alt: "Slide 3" },
];

export default function Carousel() {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % images.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    timeoutRef.current = setTimeout(nextSlide, 3000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current]);

  return (
    <div className="carousel relative w-full max-w-2xl mx-auto overflow-hidden">
      <div className="relative h-64">
        {images.map((img, idx) => (
          <div
            key={img.src}
            className={`absolute inset-0 transition-opacity duration-700 ${idx === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              priority={idx === 0}
            />
          </div>
        ))}
      </div>
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-2 shadow"
        onClick={prevSlide}
        aria-label="Previous slide"
        type="button"
      >
        &#8592;
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/70 rounded-full p-2 shadow"
        onClick={nextSlide}
        aria-label="Next slide"
        type="button"
      >
        &#8594;
      </button>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, idx) => (
          <span
            key={idx}
            className={`block w-2 h-2 rounded-full ${idx === current ? "bg-blue-600" : "bg-gray-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
