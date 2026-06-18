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
    whatsapp?: string | null;
    whatsappChatEnabled?: boolean;
  };
  submitLabel?: string;
  canEditMembershipStatus?: boolean;
  canEditRating?: boolean;
  showWhatsapp?: boolean;
};

export function PlayerForm({
  action,
  player,
  submitLabel = "Salvar jogador",
  canEditMembershipStatus = false,
  canEditRating = true,
  showWhatsapp = false
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
      {showWhatsapp ? (
        <div className="space-y-2 rounded-[13px] border-[1.5px] border-linha bg-white p-3">
          <div>
            <Label>WhatsApp</Label>
            <Input name="whatsapp" type="tel" inputMode="tel" defaultValue={player?.whatsapp || ""} placeholder="Ex: 11999999999" />
          </div>
          <label className="flex items-start gap-2 text-sm font-semibold text-tinta">
            <input
              name="whatsappChatEnabled"
              type="checkbox"
              defaultChecked={Boolean(player?.whatsappChatEnabled)}
              className="mt-1 h-4 w-4 rounded border-linha text-campo"
            />
            <span>Permitir que jogadores das minhas peladas abram conversa pelo WhatsApp</span>
          </label>
        </div>
      ) : null}
      <Button className="w-full" type="submit">{submitLabel}</Button>
    </form>
  );
}
