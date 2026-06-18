import { PhotoUpload } from "@/components/forms/PhotoUpload";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";

type PlayerFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  player?: {
    name: string;
    nickname?: string | null;
    photoUrl?: string | null;
    position: string;
    membershipStatus?: string;
    rating: number;
  };
  submitLabel?: string;
  canEditMembershipStatus?: boolean;
  canEditRating?: boolean;
};

export function PlayerForm({
  action,
  player,
  submitLabel = "Salvar jogador",
  canEditMembershipStatus = false,
  canEditRating = true
}: PlayerFormProps) {
  return (
    <form action={action} className="space-y-4">
      <PhotoUpload defaultUrl={player?.photoUrl} />
      <div>
        <Label>Nome</Label>
        <Input name="name" defaultValue={player?.name} required />
      </div>
      <div>
        <Label>Apelido</Label>
        <Input name="nickname" defaultValue={player?.nickname || ""} />
      </div>
      <div>
        <Label>Posicao</Label>
        <Select name="position" defaultValue={player?.position || "MEIA"}>
          <option value="GOLEIRO">Goleiro</option>
          <option value="DEFESA">Defesa</option>
          <option value="MEIA">Meia</option>
          <option value="ATAQUE">Ataque</option>
        </Select>
      </div>
      {canEditMembershipStatus ? (
        <div>
          <Label>Status</Label>
          <Select name="membershipStatus" defaultValue={player?.membershipStatus || "MENSALISTA"}>
            <option value="MENSALISTA">Mensalista</option>
            <option value="CONVIDADO">Convidado</option>
          </Select>
        </div>
      ) : null}
      {canEditRating ? (
        <div>
          <Label>Nota de 0 a 5</Label>
          <Input name="rating" type="number" min={0} max={5} step={0.5} defaultValue={player?.rating ?? 3} required />
        </div>
      ) : null}
      <Button className="w-full" type="submit">{submitLabel}</Button>
    </form>
  );
}
