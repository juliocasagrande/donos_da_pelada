import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { LocationAutocomplete } from "@/components/forms/LocationAutocomplete";
import { surfaces } from "@/lib/validations";
import { surfaceLabel } from "@/lib/utils";

function dateInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function timeInputValue(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

type MatchFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  match?: {
    title: string;
    date: Date;
    surface: string;
    location?: string | null;
  };
  submitLabel?: string;
};

export function MatchForm({ action, match, submitLabel = "Criar pelada" }: MatchFormProps) {
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-3">
      <div>
        <Label>Nome da pelada</Label>
        <Input name="title" defaultValue={match?.title ?? "Pelada da semana"} required />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Data</Label>
          <Input name="date" type="date" defaultValue={match ? dateInputValue(match.date) : today} required />
        </div>
        <div>
          <Label>Horario</Label>
          <Input name="time" type="time" defaultValue={match ? timeInputValue(match.date) : "19:00"} required />
        </div>
      </div>
      <div className="grid grid-cols-[1fr_92px] gap-2">
        <div>
          <Label>Local</Label>
          <LocationAutocomplete name="locationStreet" defaultValue={match?.location ?? ""} />
        </div>
        <div>
          <Label>Numero</Label>
          <Input name="locationNumber" placeholder="123" />
        </div>
      </div>
      <div>
        <Label>Tipo de quadra</Label>
        <div className="grid grid-cols-3 gap-2">
          {surfaces.map((option) => (
            <label key={option} className="cursor-pointer">
              <input
                type="radio"
                name="surface"
                value={option}
                defaultChecked={(match?.surface ?? "SOCIETY") === option}
                className="peer sr-only"
              />
              <span className="block rounded-[11px] border-[1.5px] border-linha bg-white px-3 py-3 text-center text-sm font-semibold text-musgo transition peer-checked:border-campo peer-checked:bg-campo peer-checked:text-white">
                {surfaceLabel(option)}
              </span>
            </label>
          ))}
        </div>
      </div>
      <Button className="w-full" type="submit">{submitLabel}</Button>
    </form>
  );
}
