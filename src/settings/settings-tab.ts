import { App, Modal, PluginSettingTab, Setting } from "obsidian";
import type { ColorSchemeItem } from "../types";
import { DEFAULT_COLOR_SCHEMES } from "./index";
import { isValidHexColor } from "../utils";
import type HeatmapBasesViewPlugin from "../main";

export class HeatmapSettingTab extends PluginSettingTab {
  plugin: HeatmapBasesViewPlugin;

  constructor(app: App, plugin: HeatmapBasesViewPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName("Color schemes").setHeading();

    new Setting(containerEl)
      .setDesc(
        "Add, edit, or remove color schemes used in heatmaps. Changes are available in the view settings."
      )
      .addButton(btn =>
        btn.setButtonText("Add color scheme").setCta().onClick(() => this.addScheme())
      );

    for (const scheme of this.plugin.settings.colorSchemes) {
      this.renderSchemeRow(containerEl, scheme);
    }
  }

  private renderSchemeRow(containerEl: HTMLElement, scheme: ColorSchemeItem): void {
    const setting = new Setting(containerEl)
      .setName(scheme.name)
      .setDesc(`${scheme.zeroColor} → ${scheme.maxColor}`)
      .addButton(btn =>
        btn.setIcon("pencil").setTooltip("Edit").onClick(() => this.editScheme(scheme))
      )
      .addButton(btn =>
        btn.setIcon("trash").setTooltip("Delete").onClick(() => this.deleteScheme(scheme))
      );

    const previewEl = setting.controlEl.createDiv("heatmap-color-scheme-preview");
    previewEl.setCssProps({
      background: `linear-gradient(to right, ${scheme.zeroColor}, ${scheme.maxColor})`,
    });
    setting.controlEl.insertBefore(previewEl, setting.controlEl.firstChild);
  }

  private addScheme(): void {
    const newScheme: ColorSchemeItem = {
      id: "",
      name: "",
      zeroColor: "#ebedf0",
      maxColor: "#39d353",
    };

    new EditSchemeModal(this.app, newScheme, true, result => {
      this.plugin.settings.colorSchemes.push(result);
      void this.plugin.saveSettings().then(() => this.display());
    }).open();
  }

  private editScheme(scheme: ColorSchemeItem): void {
    new EditSchemeModal(this.app, scheme, false, result => {
      const index = this.plugin.settings.colorSchemes.findIndex(s => s.id === scheme.id);
      if (index !== -1) {
        this.plugin.settings.colorSchemes[index] = result;
        void this.plugin.saveSettings().then(() => this.display());
      }
    }).open();
  }

  private async deleteScheme(scheme: ColorSchemeItem): Promise<void> {
    const index = this.plugin.settings.colorSchemes.findIndex(s => s.id === scheme.id);
    if (index !== -1) {
      this.plugin.settings.colorSchemes.splice(index, 1);
      if (this.plugin.settings.colorSchemes.length === 0) {
        this.plugin.settings.colorSchemes = [...DEFAULT_COLOR_SCHEMES];
      }
      await this.plugin.saveSettings();
      this.display();
    }
  }
}

class EditSchemeModal extends Modal {
  private scheme: ColorSchemeItem;
  private isNew: boolean;
  private onSave: (scheme: ColorSchemeItem) => void;
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

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: this.isNew ? "Add color scheme" : "Edit color scheme" });

    new Setting(contentEl)
      .setName("Name")
      .setDesc("Display name for this color scheme")
      .addText(text =>
        text
          .setPlaceholder("My custom scheme")
          .setValue(this.scheme.name)
          .onChange(value => (this.scheme.name = value))
      );

    new Setting(contentEl)
      .setName("Zero color")
      .setDesc("Color for empty/zero values (hex format, e.g. #ebedf0)")
      .addText(text =>
        text
          .setPlaceholder("#ebedf0")
          .setValue(this.scheme.zeroColor)
          .onChange(value => (this.scheme.zeroColor = value))
      );

    new Setting(contentEl)
      .setName("Max color")
      .setDesc("Color for maximum values (hex format, e.g. #39d353)")
      .addText(text =>
        text
          .setPlaceholder("#39d353")
          .setValue(this.scheme.maxColor)
          .onChange(value => (this.scheme.maxColor = value))
      );

    this.errorEl = contentEl.createDiv("heatmap-modal-error");

    new Setting(contentEl)
      .addButton(btn => btn.setButtonText("Save").setCta().onClick(() => this.save()))
      .addButton(btn => btn.setButtonText("Cancel").onClick(() => this.close()));
  }

  private save(): void {
    if (!this.scheme.name.trim()) {
      this.showError("Name is required");
      return;
    }
    if (!isValidHexColor(this.scheme.zeroColor)) {
      this.showError("Zero color must be a valid hex color (e.g. #ebedf0)");
      return;
    }
    if (!isValidHexColor(this.scheme.maxColor)) {
      this.showError("Max color must be a valid hex color (e.g. #39d353)");
      return;
    }

    if (!this.scheme.zeroColor.startsWith("#")) {
      this.scheme.zeroColor = `#${this.scheme.zeroColor}`;
    }
    if (!this.scheme.maxColor.startsWith("#")) {
      this.scheme.maxColor = `#${this.scheme.maxColor}`;
    }

    if (this.isNew) {
      this.scheme.id = this.scheme.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!this.scheme.id) {
        this.scheme.id = "scheme";
      }
    }

    this.onSave(this.scheme);
    this.close();
  }

  private showError(message: string): void {
    if (this.errorEl) {
      this.errorEl.textContent = message;
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}
