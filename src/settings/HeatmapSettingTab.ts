import { App, Notice, PluginSettingTab, Setting, moment } from "obsidian";
import { t } from "../i18n";
import type { ColorSchemeItem } from "../types";
import { DEFAULT_COLOR_SCHEMES } from "./index";
import type HeatmapBasesViewPlugin from "../main";
import { EditSchemeModal } from "./EditSchemeModal";
import { getColorForIntensity, INTENSITY_LEVELS, getSchemeDefinition } from "../utils";

export class HeatmapSettingTab extends PluginSettingTab {
  plugin: HeatmapBasesViewPlugin;

  constructor(app: App, plugin: HeatmapBasesViewPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    this.containerEl.empty();
    this.renderDateFormatSection(this.containerEl);
    this.renderHeader(this.containerEl);
    this.renderSchemeList(this.containerEl);
  }

  private renderDateFormatSection(containerEl: HTMLElement): void {
    const formatRefUrl = "https://momentjs.com/docs/#/displaying/format/";
    const getPreview = (format: string): string => {
      try {
        const m = (moment as unknown as (d?: unknown) => { format: (f: string) => string })();
        return format && format.trim() ? m.format(format.trim()) : "YYYY-MM-DD";
      } catch {
        return "YYYY-MM-DD";
      }
    };

    const updateDesc = (setting: Setting, format: string) => {
      const desc = createFragment((frag: DocumentFragment) => {
        frag.appendText(t("settings.dateFormat.referTo") + " ");
        const a = document.createElement("a");
        a.href = formatRefUrl;
        a.textContent = t("settings.dateFormat.formatReference");
        a.target = "_blank";
        a.rel = "noopener";
        frag.appendChild(a);
        frag.appendText(". ");
        frag.appendChild(document.createElement("br"));
        frag.appendText(t("settings.dateFormat.previewLabel") + " ");
        const strong = document.createElement("strong");
        strong.textContent = getPreview(format);
        strong.addClass("heatmap-date-format-preview");
        frag.appendChild(strong);
      });
      setting.setDesc(desc);
    };

    const setting = new Setting(containerEl)
      .setName(t("settings.dateFormat.heading"))
      .addText((text) =>
        text
          // eslint-disable-next-line obsidianmd/ui/sentence-case -- format token, not UI text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.plugin.settings.dateFormat ?? "YYYY-MM-DD")
          .onChange(async (value) => {
            this.plugin.settings.dateFormat = value || "YYYY-MM-DD";
            updateDesc(setting, this.plugin.settings.dateFormat);
            await this.plugin.saveSettings();
            this.plugin.refreshAllViews();
          })
      );

    updateDesc(setting, this.plugin.settings.dateFormat ?? "YYYY-MM-DD");
  }

  private renderHeader(containerEl: HTMLElement): void {
    new Setting(containerEl).setName(t("settings.colorSchemes.heading")).setHeading();

    new Setting(containerEl).setDesc(t("settings.colorSchemes.description")).addButton((btn) =>
      btn
        .setButtonText(t("settings.colorSchemes.addButton"))
        .setCta()
        .onClick(() => this.openAddSchemeModal())
    );
  }

  private renderSchemeList(containerEl: HTMLElement): void {
    for (const scheme of this.plugin.settings.colorSchemes) {
      this.renderSchemeRow(containerEl, scheme);
    }
  }

  private renderSchemeRow(containerEl: HTMLElement, scheme: ColorSchemeItem): void {
    const setting = new Setting(containerEl)
      .setName(scheme.name)
      .addButton((btn) =>
        btn
          .setIcon("pencil")
          .setTooltip(t("settings.colorSchemes.editTooltip"))
          .onClick(() => this.openEditSchemeModal(scheme))
      )
      .addButton((btn) =>
        btn
          .setIcon("trash")
          .setTooltip(t("settings.colorSchemes.deleteTooltip"))
          .onClick(() => this.deleteScheme(scheme))
      );

    this.addColorPreview(setting, scheme);
  }

  private addColorPreview(setting: Setting, scheme: ColorSchemeItem): void {
    const previewEl = setting.controlEl.createDiv("heatmap-color-scheme-preview");

    const schemeDefinition = getSchemeDefinition(scheme);
    const isDark = this.app.isDarkMode();
    for (const intensity of INTENSITY_LEVELS) {
      const cellEl = previewEl.createDiv("heatmap-color-scheme-preview-cell");
      const color = getColorForIntensity(intensity, schemeDefinition, isDark);
      cellEl.style.setProperty("background-color", color, "important");
    }

    setting.controlEl.insertBefore(previewEl, setting.controlEl.firstChild);
  }

  private openAddSchemeModal(): void {
    const newScheme: ColorSchemeItem = {
      ...DEFAULT_COLOR_SCHEMES[0],
      id: "",
      name: "",
      isDefault: false,
    };

    new EditSchemeModal(this.app, newScheme, true, (result) => {
      this.plugin.settings.colorSchemes.push(result);
      void this.saveAndRefresh();
    }).open();
  }

  private openEditSchemeModal(scheme: ColorSchemeItem): void {
    new EditSchemeModal(this.app, scheme, false, (result) => {
      this.updateScheme(scheme.id, result);
      void this.saveAndRefresh();
    }).open();
  }

  private getSchemeIndex(schemeId: string): number {
    return this.plugin.settings.colorSchemes.findIndex((s) => s.id === schemeId);
  }

  private updateScheme(schemeId: string, updatedScheme: ColorSchemeItem): void {
    const index = this.getSchemeIndex(schemeId);
    if (index !== -1) {
      this.plugin.settings.colorSchemes[index] = updatedScheme;
    }
  }

  private async deleteScheme(scheme: ColorSchemeItem): Promise<void> {
    this.removeSchemeFromSettings(scheme.id);
    this.ensureAtLeastOneScheme();
    await this.saveAndRefresh();
  }

  private removeSchemeFromSettings(schemeId: string): void {
    const index = this.getSchemeIndex(schemeId);
    if (index !== -1) {
      this.plugin.settings.colorSchemes.splice(index, 1);
    }
  }

  private ensureAtLeastOneScheme(): void {
    if (this.plugin.settings.colorSchemes.length === 0) {
      this.plugin.settings.colorSchemes = [...DEFAULT_COLOR_SCHEMES];
    }
  }

  private async saveAndRefresh(): Promise<void> {
    await this.plugin.saveSettings();
    this.plugin.refreshAllViews();
    this.display();
    new Notice(t("settings.colorSchemes.saved"));
  }
}
