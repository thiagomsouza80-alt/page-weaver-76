import { Label } from "@/components/ui/label";

const positions = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Baixo" },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
  imageUrl?: string | null;
}

const ImagePositionSelector = ({ value, onChange, imageUrl }: Props) => {
  return (
    <div className="space-y-2">
      <Label>Posição da Imagem</Label>
      <div className="flex items-start gap-4">
        <div className="flex gap-2">
          {positions.map((pos) => (
            <button
              key={pos.value}
              type="button"
              onClick={() => onChange(pos.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                value === pos.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>
        {imageUrl && (
          <div className="w-24 h-16 rounded-lg overflow-hidden border border-border shrink-0">
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              style={{ objectPosition: value }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePositionSelector;
