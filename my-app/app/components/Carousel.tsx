"use client";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const images = [
  {
    src: "/images/demo-conference.svg",
    alt: "Conferencia em palco com publico e luzes",
    title: "Conferencias",
    description: "Palestras, paineis e encontros profissionais.",
  },
  {
    src: "/images/demo-workshop.svg",
    alt: "Workshop colaborativo com notebook e materiais de trabalho",
    title: "Workshops",
    description: "Atividades praticas com vagas e inscricoes organizadas.",
  },
  {
    src: "/images/demo-festival.svg",
    alt: "Festival ao ar livre com palco, tenda e visitantes",
    title: "Festivais",
    description: "Experiencias presenciais para diferentes publicos.",
  },
];

export default function Carousel() {
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % images.length);
  const prevSlide = () => setCurrent((prev) => (prev - 1 + images.length) % images.length);

  useEffect(() => {
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % images.length);
    }, 4500);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [current]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/30">
      <div className="relative aspect-[16/9] min-h-[280px]">
        {images.map((img, idx) => (
          <div
            key={img.src}
            className={`absolute inset-0 transition-opacity duration-700 ${
              idx === current ? "z-10 opacity-100" : "z-0 opacity-0"
            }`}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover"
              priority={idx === 0}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent px-5 pb-5 pt-20 sm:px-8 sm:pb-7">
              <p className="text-xs font-bold uppercase tracking-widest text-secondary">
                {img.title}
              </p>
              <p className="mt-2 max-w-xl text-xl font-black tracking-tight text-white sm:text-3xl">
                {img.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <button
        className="absolute left-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white shadow-lg backdrop-blur hover:bg-slate-800"
        onClick={prevSlide}
        aria-label="Imagem anterior"
        type="button"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        className="absolute right-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-slate-950/75 text-white shadow-lg backdrop-blur hover:bg-slate-800"
        onClick={nextSlide}
        aria-label="Proxima imagem"
        type="button"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>
      <div className="absolute bottom-4 right-5 z-20 flex gap-2 sm:right-8">
        {images.map((img, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`Ir para ${img.title}`}
            onClick={() => setCurrent(idx)}
            className={`h-2.5 rounded-full transition-all ${
              idx === current ? "w-8 bg-secondary" : "w-2.5 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
