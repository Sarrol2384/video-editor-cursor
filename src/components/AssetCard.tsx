interface AssetCardProps {
  asset: {
    id: string;
    type: string;
    source: string;
    storageUrl: string;
    metadata: string;
    createdAt: string;
    project?: { id: string; name: string } | null;
  };
}

export function AssetCard({ asset }: AssetCardProps) {
  const meta = (() => {
    try {
      return JSON.parse(asset.metadata);
    } catch {
      return {};
    }
  })();

  return (
    <div className="card overflow-hidden p-0">
      <div className="aspect-video bg-gray-100">
        {asset.type === "image" && asset.storageUrl && (
          <img
            src={asset.storageUrl}
            alt="Asset"
            className="h-full w-full object-contain"
          />
        )}
        {asset.type === "video" && asset.storageUrl && (
          <img
            src={asset.storageUrl}
            alt="Video preview"
            className="h-full w-full object-contain"
          />
        )}
        {asset.type === "audio" && (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg className="h-12 w-12" fill="currentColor" viewBox="0 0 20 20">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase text-gray-500">
            {asset.type}
          </span>
          <span className="text-xs text-gray-400">{asset.source}</span>
        </div>
        {asset.project && (
          <p className="mt-1 truncate text-sm text-gray-700">
            {asset.project.name}
          </p>
        )}
        {meta.overlayText && (
          <p className="mt-1 truncate text-xs text-gray-500">
            &quot;{meta.overlayText}&quot;
          </p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {new Date(asset.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
