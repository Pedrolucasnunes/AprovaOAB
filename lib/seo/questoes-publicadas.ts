/**
 * As questões que JÁ TÊM URL pública no ar, submetida ao Google.
 *
 * Não é curadoria nem cache: é um LIVRO-CAIXA. Uma linha aqui significa "esta
 * URL existe lá fora", e é por isso que a lista é **append-only**. Acrescentar
 * é o único movimento permitido; remover uma linha é apagar uma página que o
 * Google já conhece.
 *
 * ## Por que ele existe
 *
 * `selectBest` RECALCULA o conjunto público a cada leitura, a partir do banco.
 * O primeiro critério dele é "uma questão por tópico distinto" — então toda
 * importação que traga tópicos novos reordena a escolha e EMPURRA PARA FORA
 * questões que já estavam publicadas.
 *
 * Medido em 11/set/2026, com o 47º Exame recém-importado (80 questões, 18
 * tópicos novos): **25 das 200 URLs publicadas sairiam do conjunto** —
 * Processo do Trabalho 4/10, Processo Civil 3/10, Administrativo · Financeiro ·
 * Penal · ECA 2/10 cada. E o que elas viram não é 301, é **404**:
 * `getPublicQuestionById` confere se a questão pertence ao subconjunto público
 * e devolve `null` quando não, e a página chama `notFound()`.
 *
 * O 48º rearmaria a mesma bomba. O 49º também. O conserto não é excluir uma
 * edição — é a URL publicada deixar de depender de um cálculo que muda.
 *
 * ## Como esta lista nasceu
 *
 * Os 200 UUIDs do sitemap **servido em produção** em 11/set/2026 — o que o
 * Google recebeu, não o que o código acha que publicou. A extração foi
 * validada reproduzindo `selectBest` contra o banco **sem** o 47º: bateu 200
 * de 200, zero divergência nos dois sentidos. Sem essa validação a lista seria
 * um palpite com cara de registro.
 *
 * ## Como publicar mais (a alavanca da Fase 2)
 *
 * Suba `PUBLIC_QUESTIONS_PER_SUBJECT`, faça o deploy, e **depois** acrescente
 * aqui os UUIDs que o sitemap novo passou a expor. Nessa ordem: primeiro a URL
 * existe, depois ela entra no livro. O contrário grava promessa, não fato.
 */
export const QUESTOES_PUBLICADAS: ReadonlySet<string> = new Set([
  // direito-administrativo
  "00d35907-8f60-4041-8c40-390f065f414b",
  "0275370d-9220-4b42-b402-bec257d272e0",
  "0543b50b-cfc3-4ab6-962a-3eb958f57e4a",
  "0817cd2a-100e-4a71-a8df-1a3cc9c35994",
  "095d77b1-c87a-46f6-b912-27f7359d94bc",
  "09bdcce3-d0ae-479c-adcb-3c82b0c1ef8c",
  "0d57b250-7ef6-4e32-913a-4103a1911338",
  "1825bde2-d9b1-46d2-9ad6-29fb9b32b45d",
  "1f81e637-86f5-4c86-984b-4bca5c8eb205",
  "20678d6c-80c4-4f29-9500-c2b3706f5164",

  // direito-ambiental
  "00385a9c-8bea-4967-93bb-833c61f4348c",
  "0b07b833-7fc6-45a6-a8b8-b743655e9682",
  "0bfe3f2a-df28-4396-9f7c-5d1bf924cd10",
  "11163896-b391-460e-bdce-a8e7c3fc8eda",
  "182727ba-f0d6-4ce4-a2ad-5209cef05971",
  "18d7504a-8025-4cda-b06e-ecf3fa2c9bdd",
  "1971f28f-bea6-42b7-98fc-2abd8dd9f6be",
  "1e817584-2ea3-4f35-8edc-5f6460f8a4c8",
  "2c639883-d303-4852-9b30-90a930809876",
  "2c80c712-8e26-49dc-8f99-617575de7eeb",

  // direito-civil
  "00110fb7-1098-4479-8aac-8670baf37188",
  "00fc5d56-d7f3-43dd-a0a0-bb704a2e6249",
  "0129e4ef-8977-4f4e-bfbc-03721558fb8a",
  "017fc3e9-a76e-4c0f-b0f1-c87a170276d3",
  "0191afeb-e168-4bbd-9e18-3f4a7109594e",
  "030a7c8c-089e-4b99-b2cf-2af647df3e3b",
  "0702742c-b6dc-4810-af1b-30f2ea152e3c",
  "1030ece8-e9be-4607-b707-f7d6226c3e55",
  "2f9bbee8-9bb0-4f98-833f-0b9ab52184d3",
  "84559c00-e554-479e-a4a7-c90e784fbe62",

  // direito-constitucional
  "02530ef3-e92f-4620-b704-74ed57a260ae",
  "0513c468-e887-490e-af02-cfef996c6c84",
  "07f89aa9-1bab-4bd3-9a20-a3fb044a340d",
  "08b9332c-b9fd-4cf7-8806-62fb3f3128a3",
  "11ccb7f5-64b1-4609-99e1-d604cb3aa983",
  "12092a1a-dad4-4c0e-8b8b-187dac1ed4f0",
  "18ab5fb4-77f4-4242-8422-c870263b5152",
  "1a58898a-c77b-4880-8d21-e64407bbe824",
  "6bfc07c6-28d0-477f-870b-5cd1369e97ab",
  "97f59c8c-3331-40fc-89e1-f154e70ce544",

  // direito-do-consumidor
  "0081551c-3753-4aa8-9bea-b8094153022f",
  "02f8a2c8-ae4f-4191-897b-ce81c4ad5a14",
  "08bf834e-a383-47e2-804a-a558a485678d",
  "0ad053a2-855c-4fa4-b6a9-5c75adf621bd",
  "0f490265-327a-4933-ad9b-c5f4e7a5985d",
  "15c4ae30-b636-4510-8681-ad31c153e0f0",
  "163f7782-f881-4afe-bc8a-baadf7f06db2",
  "1f176022-9aa7-4945-b234-8ddf4580d29c",
  "25cb551d-8298-4c66-a1e1-315538e7d1a9",
  "c960983a-113d-47b5-b334-954323967136",

  // direito-do-trabalho
  "029f7371-493f-440f-bb99-6c080a7281a5",
  "02be1ed9-8198-47ff-8195-221f75150276",
  "03818bed-e02d-4695-86f9-8283f7d8aeaf",
  "05831ea1-958d-437a-b70d-0afa458a8c8f",
  "05f4bf71-6c83-4cca-b991-c071ef69b8ac",
  "08710842-c722-4676-99c9-0ccf42feb342",
  "0949a72f-e07a-4fee-8ccb-a11ccb7b8ca9",
  "0b3cbda1-46dd-46f5-950d-9278ab8c4fe3",
  "0ccb02a5-271c-4313-a53d-d9ec3603d245",
  "0dc83fc6-aaca-4950-9eb2-279e91527bca",

  // direito-eleitoral
  "22015929-0e35-464b-880d-f1cdf8156086",
  "27688450-69e8-4c54-924c-21afd13b6aa9",
  "2f241e0e-030b-432a-8f72-a74812e90f0c",
  "318b3b2c-24c6-4d79-8173-a49368d60ded",
  "38781a34-a957-4702-889a-5d2c7b98dc35",
  "3f8430f5-8a75-4e0a-807d-78cd07c8c0ce",
  "52db3448-c68d-4a0b-a015-ebf3d67308e2",
  "81f00609-afe1-4a25-816a-d0e2cfcc4096",
  "87dba69a-c536-4f69-8ea4-ff62e61dd102",
  "c1a43abf-0257-4f41-a8cd-5ac05582b4ad",

  // direito-empresarial
  "0326fb21-3096-4bee-a307-d09f45794549",
  "07bab620-1f1b-4cba-a602-9b204ec990ff",
  "08067e49-383f-4ce5-a2f5-35be39696f9b",
  "08742ddf-e210-41c7-9173-863846a1a02e",
  "0935fc6f-acc4-445c-b0c3-c4af16127699",
  "0d52c335-410c-4b7d-9f81-62e5d577d95e",
  "0ff22aab-c6b7-4976-8e3b-24613f4f34b5",
  "13635587-8587-4522-856a-0d72247b2c98",
  "1a0bf0eb-58de-4ec4-b2a7-60b5b21718d2",
  "1a52c72c-d29f-4a99-ac82-0e41f683a200",

  // direito-financeiro
  "0591b8e5-ca3f-4913-b8c1-c935914b74f3",
  "125f4cec-d957-4b0a-a919-674d027f7405",
  "22413a58-2f52-4003-871a-98bcb92dc2f1",
  "36227f1b-4b29-4da3-bc0c-d64bf55d9818",
  "489302e5-41dc-4913-ba43-ad8d714eb091",
  "4be49663-07bd-4b96-8155-650c3d45dcaa",
  "61665145-a419-4631-b735-ac2de03ac1d5",
  "751ada04-fc23-4156-81ad-ce3f1cf2840e",
  "9341dd66-aca0-4795-a21a-0116d56e1ce1",
  "fca6e39e-2b6e-42de-a13d-026b80eed90d",

  // direito-internacional
  "020ae7ca-9f5d-47c0-a468-4b7a71f13417",
  "027a2bd8-b676-4517-bae6-1c7ba8de9e73",
  "0636badf-ab0f-4201-8477-332fe222aab6",
  "0876439e-6593-4bed-8281-e7df10d477d1",
  "0f6c0036-7ad3-4a04-9f2c-28b983a8678c",
  "0ffa682a-3440-4e62-999b-e3b5102955b9",
  "1bf72eed-129b-432b-bf8d-616999610122",
  "1ca1efed-bb43-47d7-a48c-613cebe07838",
  "3684e9de-cc53-4628-8eec-47de8b2444c8",
  "3941f7c1-5660-420e-80e5-72c761db5de1",

  // direito-penal
  "0070295c-d210-46c1-baa2-b896029670cc",
  "01851fa6-e5b8-4b49-a6f6-4e6d8f363ed0",
  "020a0508-ad84-407d-bda6-18508a9d61bb",
  "027ebedf-dc8d-414d-ac88-c64edc02edf1",
  "035e3af5-6392-438d-9ef9-6eb11f9293f0",
  "0542ca31-5484-4c15-b251-bc068d5058e0",
  "07a1851e-ae40-44a1-8c96-e41c530c57e6",
  "0a680328-c6e8-4c28-bd15-b8e3db506dbe",
  "0e8d02aa-6821-41ba-8e3e-67b37fd01e09",
  "133a1322-7a21-43dc-b0fb-9ff76fead961",

  // direito-previdenciario
  "0e978631-e743-46e4-ba0c-e058f4c938b8",
  "17849b72-380f-4cfe-a909-a74b1a95fdde",
  "283e440f-a289-4f7d-a1a4-8ca85310813d",
  "337e082b-9560-482c-bcc5-6d7f353a93b3",
  "525ddb96-1a8a-4fab-b9c2-f3ec1c90b54d",
  "59b4d29d-416d-4a44-a3f1-9099c6cc0479",
  "5dbc85da-80b1-4c75-b6fd-4c1d6658868b",
  "6a6c6fd8-e30f-4c5a-8527-c28af4b0fa0e",
  "73dc16bc-c46c-4986-b9dc-e93f26eb6813",
  "966c5f85-aaa9-4bd4-a25f-12b2a71f96e2",

  // direito-tributario
  "001babf3-d323-492e-8b05-913e0324e3c9",
  "01fcd75e-7561-4363-b1ff-7bd2e34fe3b6",
  "026d82b8-fae8-48f7-b9c8-59723cd2a76f",
  "088e22be-4349-4882-b4c1-1c96f480c9e0",
  "08c60b73-10ae-4459-bb61-b8734c2064a2",
  "08d5bbde-bda1-499c-ad79-34675dfc775b",
  "09a45f2e-7cc3-4b4f-a3de-bcccfc92baf4",
  "09d44575-2831-449e-981a-9d14147db18d",
  "0b418089-a198-4b03-be19-4ca1ad27b593",
  "e041018e-930b-4d96-b517-3791d464e033",

  // direitos-humanos
  "09e28174-1cde-40b3-a271-cb62219193e3",
  "0be50537-ba95-43cf-b654-3bf53deecf9f",
  "1134dc13-752f-4e17-a3e1-e429e162d5da",
  "15ebe1e8-dc7a-4552-b237-4e4e8793339d",
  "1682ea96-64ae-4a4d-887b-15e6c2a91693",
  "245bd074-4a85-4602-948b-694ae2f5e6fd",
  "2c182486-030a-4a59-89e4-87a17802edff",
  "2f327a9d-9370-4693-87eb-a413c496f384",
  "321413da-9153-4708-b77e-16d1f8821b24",
  "34462220-eed1-4e3a-a743-4af3e9cc91d2",

  // estatuto-da-crianca-e-do-adolescente
  "000c5ac9-a2ef-4a8c-b178-d0f18dbe0500",
  "074bf8d8-5597-4070-bb66-9684e3079313",
  "0e7ba97d-d712-4e21-a372-4511dbca7616",
  "120392c5-0a2a-4c92-8c08-c5b4a73329d8",
  "131c8667-a486-4c10-98fe-0f24e50012f2",
  "18f3a46f-bd18-466a-892f-f7342c007d95",
  "2663aeae-b6e7-41ee-ab08-6d1c23de6c41",
  "2d3f0606-ae60-4634-9a8a-9ffbba1e8af3",
  "2e953bc3-90c9-4657-90bf-f110a98386d4",
  "30554834-305e-4ca5-972a-6d7c04a73a7b",

  // etica-profissional
  "0009a288-8043-4d19-9f35-cd3814cff390",
  "0037735f-7be6-4003-8dca-ebdb8b80703b",
  "015182c5-65b0-48ed-b61d-1c24c490fa60",
  "01ee27bf-7473-4fd7-baff-a8efc707127d",
  "02ab4433-9104-462c-9b2e-61fea420c635",
  "04a82706-61bc-4f6e-afdf-2d1013658582",
  "075703a2-3859-42b9-ac87-db5fe0c2a6ee",
  "0a5dabe6-9860-4e9d-8883-df11481a7f26",
  "1571c37d-1c2d-4e01-b313-3bd12fd39ab1",
  "16b51ac4-d8f1-4d8a-ad32-88af9ff9191c",

  // filosofia-do-direito
  "016b2da1-1df6-481b-a1ce-e5c074d891d6",
  "158e4277-8b5b-48e2-ae6a-76d42072cb90",
  "15c6c2d9-1b54-4c74-8d79-dcbb9402f420",
  "1717b0eb-1159-4f54-baa1-d3c232758c4f",
  "18979a5a-ee38-48d4-a7a9-6b072f7d336e",
  "2cba5ce7-09b2-44fc-bf30-67e0aa1f9da6",
  "2e97c332-60e5-42dd-a9f5-71350fa893ef",
  "2f9c0a2e-c99e-4468-b8fc-39dd4b08a7f0",
  "3029456f-7047-4978-a0c4-838398ee02d9",
  "30b3dbb2-86bd-4da1-9b7c-86672fc6860a",

  // processo-civil
  "002c78b4-37b4-481f-a9d4-4c8ef539fb8c",
  "009536d5-d886-41c2-a676-be63d968a37d",
  "00d94de0-5001-473b-83a9-db6b7ba5cdce",
  "0141a225-6ff8-4238-960e-0e48595ca388",
  "0317d27e-8c90-4729-9ffd-251a171f490a",
  "033c6667-2c7e-4f14-89a7-8572aeeae199",
  "12fda4fa-fcd1-4b9d-b14d-7ec07655f0a7",
  "949b5a75-4b77-4925-91de-e90ee3ad2fbf",
  "b7f78a83-ee61-45e8-bbad-54af6e023f18",
  "ccc8e0b5-90ab-4fdc-93f1-b18459cb5152",

  // processo-do-trabalho
  "0115e937-d040-402d-beb6-c6b32ce186e0",
  "06cb223d-9754-4663-826c-fed10fffd536",
  "073d5056-f659-472f-bd4a-9203af94346d",
  "09587827-5bc7-498a-b00d-4b377f3ae46b",
  "0ad0e140-259e-476d-99d2-f9af86eee530",
  "0b6d4e61-9a33-4ffd-91b9-9fccbb110fcd",
  "0e607b49-5c39-496e-bc3f-9eeada7879d0",
  "1149321a-3f82-4525-8d97-fd9bb783105b",
  "11d911fb-97a3-4e16-addc-1b69af4e8912",
  "12c134ca-953f-40dd-8529-b8c0202f24bc",

  // processo-penal
  "01d714fb-22cf-4b04-9e62-89e4b67e5fa7",
  "0453c5d6-09c1-4386-bfc8-20f9d8340ae0",
  "045e700b-82c7-40d9-b6b9-092e6e7c338c",
  "06e8296c-e5df-4025-9280-a656132b86f8",
  "06f403f4-a23e-4edb-bf8f-b20ffc1bbe72",
  "08925dba-74ff-47ff-a891-4584bdb7b592",
  "08a7dc14-19a2-483b-8aca-20b37984def5",
  "0af6e385-a44b-4ff0-80e8-2f143fa18075",
  "0dd41fee-614b-47c4-9e8e-35d75abcb319",
  "14d2c9d2-da13-4e8c-aa96-abfc833f6e8f",
])
