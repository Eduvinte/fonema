export interface ChatWord {
  word: string;
  translation: string;
  example: string;
}

export type ChatActionPayload =
  | {
      type: 'create_section';
      name: string;
      words: ChatWord[];
    }
  | {
      type: 'add_words';
      sectionId?: string;
      sectionName?: string;
      words: ChatWord[];
    };

export interface ChatActionDto {
  type: 'create_section' | 'add_words';
  name?: string;
  sectionName?: string;
  wordCount: number;
  preview: string[];
}
