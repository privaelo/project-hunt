"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Play, Pause, Expand, X } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

type MediaItem = {
  _id: string;
  storageId: string;
  type: string;
  url: string | null;
};

type ProjectMediaCarouselProps = {
  media: MediaItem[];
};

export function ProjectMediaCarousel({ media }: ProjectMediaCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [baseAspectRatio, setBaseAspectRatio] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedApi, setExpandedApi] = useState<CarouselApi>();
  const [expandedCurrent, setExpandedCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!expandedApi) return;

    const onSelect = () => {
      setExpandedCurrent(expandedApi.selectedScrollSnap());
    };

    onSelect();
    expandedApi.on("select", onSelect);

    return () => {
      expandedApi.off("select", onSelect);
    };
  }, [expandedApi]);

  // Scroll expanded carousel to correct slide when opened
  useEffect(() => {
    if (isExpanded && expandedApi) {
      expandedApi.scrollTo(current, true);
    }
  }, [isExpanded, expandedApi, current]);

  const handleExpand = () => {
    setIsExpanded(true);
  };

  const handleClose = () => {
    // Sync position back to main carousel
    if (api && expandedApi) {
      api.scrollTo(expandedApi.selectedScrollSnap(), true);
    }
    setIsExpanded(false);
  };

  if (media.length === 0) return null;

  return (
    <>
      <div
        className="relative"
        style={{
          maxWidth: baseAspectRatio ? `${400 * baseAspectRatio}px` : undefined,
        }}
      >
        <Carousel setApi={setApi} className="w-full">
          <CarouselContent>
            {media.map((item, index) => (
              <CarouselItem key={item._id}>
                <MediaSlide
                  media={item}
                  aspectRatio={baseAspectRatio}
                  onAspectRatio={(ratio) => {
                    if (index === 0 && baseAspectRatio === null) {
                      setBaseAspectRatio(ratio);
                    }
                  }}
                  onExpand={handleExpand}
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

      {/* Expanded Lightbox Dialog */}
      <Dialog open={isExpanded} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent
          className="max-w-none sm:max-w-none w-[95vw] max-h-[95vh] p-0 bg-transparent border-none shadow-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Media viewer</DialogTitle>
          {/* Custom close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative w-full h-full flex items-center justify-center">
            <Carousel setApi={setExpandedApi} className="w-full max-w-[90vw]">
              <CarouselContent>
                {media.map((item) => (
                  <CarouselItem key={item._id}>
                    <ExpandedMediaSlide media={item} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {media.length > 1 && (
                <>
                  <CarouselPrevious className="left-4 bg-black/50 hover:bg-black/70 text-white border-0 w-12 h-12" />
                  <CarouselNext className="right-4 bg-black/50 hover:bg-black/70 text-white border-0 w-12 h-12" />
                </>
              )}
            </Carousel>

            {/* Dot indicators for expanded view */}
            {media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/50 rounded-full px-3 py-2">
                {media.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      index === expandedCurrent ? "bg-white" : "bg-white/50"
                    }`}
                    onClick={() => expandedApi?.scrollTo(index)}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MediaSlide({
  media,
  aspectRatio,
  onAspectRatio,
  onExpand,
}: {
  media: MediaItem;
  aspectRatio: number | null;
  onAspectRatio: (ratio: number) => void;
  onExpand: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  if (!media.url) return null;
  const isVideo = media.type === "video";

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

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onExpand();
  };

  return (
    <div
      className="relative w-full rounded-lg overflow-hidden bg-zinc-100 max-h-[400px]"
      style={{
        aspectRatio: aspectRatioValue,
      }}
    >
      {isVideo ? (
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
              if (
                event.currentTarget.videoWidth &&
                event.currentTarget.videoHeight
              ) {
                onAspectRatio(
                  event.currentTarget.videoWidth /
                    event.currentTarget.videoHeight
                );
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
                <Play
                  className="w-5 h-5 text-zinc-900 ml-0.5"
                  fill="currentColor"
                />
              )}
            </div>
          </div>
        </>
      ) : (
        <Image
          src={media.url}
          alt="Project media"
          fill
          className="object-cover"
          unoptimized
          onLoad={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            if (img.naturalWidth && img.naturalHeight) {
              onAspectRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          sizes="(max-width: 768px) 100vw, 672px"
        />
      )}

      {/* Expand button */}
      <button
        onClick={handleExpandClick}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/30 hover:bg-black/40 text-white transition-colors"
        aria-label="Expand media"
      >
        <Expand className="w-4 h-4" />
      </button>
    </div>
  );
}

function ExpandedMediaSlide({ media }: { media: MediaItem }) {
  if (!media.url) return null;
  const isVideo = media.type === "video";

  return (
    <div className="relative w-full flex items-center justify-center max-h-[85vh]">
      {isVideo ? (
        <video
          src={media.url}
          controls
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
          autoPlay={false}
        />
      ) : (
        <div className="relative w-full h-[85vh]">
          <Image
            src={media.url}
            alt="Project media"
            fill
            className="object-contain"
            unoptimized
            sizes="95vw"
          />
        </div>
      )}
    </div>
  );
}
