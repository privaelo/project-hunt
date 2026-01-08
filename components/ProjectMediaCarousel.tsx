"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Play, Pause } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

type MediaItem = {
  _id: string;
  storageId: string;
  type: string;
  url: string | null;
};

type ProjectMediaCarouselProps = {
  media: MediaItem[];
  variant?: "preview" | "detail";
};

export function ProjectMediaCarousel({
  media,
  variant = "preview",
}: ProjectMediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [baseAspectRatio, setBaseAspectRatio] = useState<number | null>(null);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    // Set initial value and subscribe to changes
    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (media.length === 0) return null;

  return (
    <div className="relative">
      <Carousel setApi={setApi} className="w-full">
        <CarouselContent>
          {media.map((item, index) => (
            <CarouselItem key={item._id}>
              <MediaSlide
                media={item}
                variant={variant}
                aspectRatio={baseAspectRatio}
                onAspectRatio={(ratio) => {
                  if (index === 0) {
                    setBaseAspectRatio((prev) => prev ?? ratio);
                  }
                }}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {media.length > 1 && (
          <>
            <CarouselPrevious className="left-2 bg-black/30 hover:bg-black/40 text-white border-0" />
            <CarouselNext className="right-2 bg-black/30 hover:bg-black/40 text-white border-0" />
          </>
        )}
      </Carousel>

      {/* Dot indicators - overlayed at bottom center */}
      {media.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/30 rounded-full px-2 py-1.5">
          {media.map((_, index) => (
            <button
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === current ? "bg-white" : "bg-white/50"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                api?.scrollTo(index);
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaSlide({
  media,
  variant,
  aspectRatio,
  onAspectRatio,
}: {
  media: MediaItem;
  variant: "preview" | "detail";
  aspectRatio: number | null;
  onAspectRatio: (ratio: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!media.url) return null;
  const isVideo = media.type === "video";
  const isDetail = variant === "detail";

  const aspectRatioValue = aspectRatio ?? 16 / 9;

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div
      className={`relative w-full rounded-lg overflow-hidden bg-zinc-100 ${
        isDetail ? "min-h-[400px] max-h-[600px]" : "max-h-[300px]"
      }`}
      style={{ aspectRatio: aspectRatioValue }}
    >
      {isVideo ? (
        isDetail ? (
          // Detail: full video controls
          <video
            src={media.url}
            controls
            className="mx-auto h-full w-full max-h-[600px] object-contain"
            onLoadedMetadata={(event) => {
              if (event.currentTarget.videoWidth && event.currentTarget.videoHeight) {
                onAspectRatio(event.currentTarget.videoWidth / event.currentTarget.videoHeight);
              }
            }}
          />
        ) : (
          // Preview: click to play/pause
          <>
            <video
              ref={videoRef}
              src={media.url}
              className="w-full h-full object-cover"
              preload="metadata"
              playsInline
              onEnded={handleVideoEnded}
              onClick={handleVideoClick}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(event) => {
                if (event.currentTarget.videoWidth && event.currentTarget.videoHeight) {
                  onAspectRatio(event.currentTarget.videoWidth / event.currentTarget.videoHeight);
                }
              }}
            />
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity ${
                isPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
              }`}
              onClick={handleVideoClick}
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white/90 shadow-lg cursor-pointer">
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-zinc-900" fill="currentColor" />
                ) : (
                  <Play className="w-5 h-5 text-zinc-900 ml-0.5" fill="currentColor" />
                )}
              </div>
            </div>
          </>
        )
      ) : (
        <Image
          src={media.url}
          alt="Project media"
          fill
          className={isDetail ? "object-contain" : "object-cover"}
          unoptimized
          onLoad={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.naturalWidth && img.naturalHeight) {
              onAspectRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          sizes={isDetail ? "(max-width: 768px) 100vw, 896px" : "(max-width: 768px) 100vw, 672px"}
        />
      )}
    </div>
  );
}
