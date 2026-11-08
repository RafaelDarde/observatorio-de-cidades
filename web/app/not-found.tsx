import { BuscaMunicipio } from "@/components/BuscaMunicipio";

export default function NaoEncontrado() {
  return (
    <div className="cartao mx-auto mt-10 max-w-xl space-y-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Município não encontrado</h1>
      <p className="text-suave">Confira o endereço ou busque pelo nome:</p>
      <BuscaMunicipio />
    </div>
  );
}
