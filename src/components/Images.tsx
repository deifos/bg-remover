import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Image } from "../db";
import { RawImage } from "@huggingface/transformers";

type CaptionModelType = ((input: any) => Promise<any>) | null;

interface ImagesProps {
  captionModel: CaptionModelType;
}

export function Images({ captionModel }: ImagesProps) {
  const images = useLiveQuery(() => db.images.reverse().toArray());

  return (
    <div>
      <h2>Images: {images?.length}</h2>
      <div className="gap-2 grid grid-cols-4">
        {images?.map((image) => {
          if (image.file.type.includes("video")) {
            return <Video video={image} key={image.id} />;
          } else {
            return (
              <ImageSpot
                image={image}
                key={image.id}
                captionModel={captionModel}
              />
            );
          }
        })}
      </div>
    </div>
  );
}

function Video({ video }: { video: Image }) {
  const imageProcessed = video.processedFile instanceof File;
  const url = URL.createObjectURL(video.file);
  return (
    <div className="">
      <video
        className="rounded-lg aspect-square object-cover"
        loop
        muted
        autoPlay
        src={url}
      ></video>
    </div>
  );
}

interface ImageSpotProps {
  image: Image;
  captionModel: CaptionModelType;
}
function ImageSpot({ image, captionModel }: ImageSpotProps) {
  const imageProcessed = image.processedFile instanceof File;
  const url = URL.createObjectURL(image.file);
  const processedURL = imageProcessed
    ? URL.createObjectURL(image.processedFile)
    : "";

  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);

  const handleGenerateCaption = async (image: Image) => {
    if (!captionModel) {
      console.error("Caption model not loaded");
      return;
    }

    setIsGeneratingCaption(true);
    try {
      const img = await RawImage.fromBlob(image.file);
      const result = await captionModel(img);
      const caption = result[0].generated_text;
      await db.images.update(image.id!, { caption });
    } catch (error) {
      console.error("Error generating caption:", error);
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  return (
    <div>
      <div key={image.id} className="grid gap-2">
        <img
          className="rounded-lg h w-full aspect-square object-cover col-start-1 row-start-1"
          src={url}
          alt={image.name}
        />
        <img
          className={`rounded-lg h w-full bg-checkered aspect-square object-cover col-start-1 row-start-1 mask ${
            imageProcessed ? "" : "processing"
          }`}
          src={processedURL}
        />
      </div>
      {image.caption && (
        <div className="bg-white text-black p-2 rounded-b-lg">
          <p>{image.caption}</p>
        </div>
      )}

      <div className="controls flex gap-2 mt-4">
        <button
          onClick={() => db.images.delete(image.id)}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          Delete
        </button>
        <a
          href={processedURL}
          download={image.processedFile?.name}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Download
        </a>
        {!image.caption && (
          <button
            onClick={() => handleGenerateCaption(image)}
            className="bg-slate-500 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded flex items-center"
            disabled={isGeneratingCaption}
          >
            {isGeneratingCaption ? (
              <>
                <Spinner className="h-5 w-5 mr-2" />
                ...
              </>
            ) : (
              "CC"
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
