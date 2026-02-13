import { App, Modal, Setting } from "obsidian";
import { t } from "../i18n";
import type { ColorSchemeItem } from "../types";
import { validateScheme, prepareSchemeForSave } from "./utils";

export class EditSchemeModal extends Modal {
  private scheme: ColorSchemeItem;
  private readonly isNew: boolean;
  private readonly onSave: (scheme: ColorSchemeItem) => void;
  private errorEl: HTMLElement | null = null;

  constructor(
    app: App,
    scheme: ColorSchemeItem,
    isNew: boolean,
    onSave: (scheme: ColorSchemeItem) => void
  ) {
    super(app);
    this.scheme = { ...scheme };
    this.isNew = isNew;
    this.onSave = onSave;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", {
      text: this.isNew ? t("settings.editModal.addTitle") : t("settings.editModal.editTitle"),
    });

    this.createNameSetting(contentEl);
    this.createZeroColorSetting(contentEl);
    this.createMaxColorSetting(contentEl);

    this.errorEl = contentEl.createDiv("heatmap-modal-error");

    this.createButtons(contentEl);
  }

  private createNameSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t("settings.editModal.nameLabel"))
      .setDesc(t("settings.editModal.nameDesc"))
      .addText((text) =>
        text
          .setPlaceholder(t("settings.editModal.namePlaceholder"))
          .setValue(this.scheme.name)
          .onChange((value) => (this.scheme.name = value))
      );
  }

  private createZeroColorSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t("settings.editModal.zeroColorLabel"))
      .setDesc(t("settings.editModal.zeroColorDesc"))
      .addColorPicker((color) =>
        color.setValue(this.scheme.zeroColor).onChange((value) => (this.scheme.zeroColor = value))
      );
  }

  private createMaxColorSetting(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .setName(t("settings.editModal.maxColorLabel"))
      .setDesc(t("settings.editModal.maxColorDesc"))
      .addColorPicker((color) =>
        color.setValue(this.scheme.maxColor).onChange((value) => (this.scheme.maxColor = value))
      );
  }

  private createButtons(containerEl: HTMLElement): void {
    new Setting(containerEl)
      .addButton((btn) =>
        btn
          .setButtonText(t("settings.editModal.saveButton"))
          .setCta()
          .onClick(() => this.handleSave())
      )
      .addButton((btn) =>
        btn.setButtonText(t("settings.editModal.cancelButton")).onClick(() => this.close())
      );
  }

  private handleSave(): void {
    const error = validateScheme(this.scheme);
    if (error) {
      this.showError(error);
      return;
    }

    const preparedScheme = prepareSchemeForSave(this.scheme, this.isNew);
    this.onSave(preparedScheme);
    this.close();
  }

  private showError(message: string): void {
    if (this.errorEl) {
      this.errorEl.textContent = message;
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
