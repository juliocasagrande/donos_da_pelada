import { PhotoUpload } from "@/components/forms/PhotoUpload";
import { RatingSlider } from "@/components/forms/RatingSlider";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { WhatsappMark } from "@/components/ui/WhatsappMark";

type PlayerFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  player?: {
    nickname: string;
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
        <Label>Apelido</Label>
        <Input name="nickname" defaultValue={player?.nickname || ""} required />
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
        <RatingSlider name="rating" label="Nota de 0 a 5" defaultValue={player?.rating ?? 3} />
      ) : null}
      {showWhatsapp ? (
        <div className="space-y-2 rounded-[13px] border-[1.5px] border-linha bg-white p-3">
          <div className="flex items-center gap-2 text-campo">
            <WhatsappMark size={20} />
            <h2 className="font-display text-base font-extrabold text-tinta">WhatsApp</h2>
          </div>
          <div>
            <Label>Numero</Label>
            <Input name="whatsapp" type="tel" inputMode="tel" defaultValue={player?.whatsapp || ""} placeholder="Ex: 11999999999" />
          </div>
          <div>
            <Label>Permitir convites e conversas?</Label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-linha bg-[#F6F8F3] px-3 py-2 text-sm font-bold text-tinta">
                <input
                  name="whatsappChatEnabled"
                  type="radio"
                  value="yes"
                  defaultChecked={Boolean(player?.whatsappChatEnabled)}
                />
                Sim
              </label>
              <label className="flex items-center justify-center gap-2 rounded-[13px] border-[1.5px] border-linha bg-[#F6F8F3] px-3 py-2 text-sm font-bold text-tinta">
                <input
                  name="whatsappChatEnabled"
                  type="radio"
                  value="no"
                  defaultChecked={!player?.whatsappChatEnabled}
                />
                Nao
              </label>
            </div>
          </div>
        </div>
      ) : null}
      <Button className="w-full" type="submit">{submitLabel}</Button>
    </form>
  );
}
