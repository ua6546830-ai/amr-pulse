import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.describe("AMR PULSE demo workspace", () => {
  test("load demo, audit quality, analyse, investigate, build and download a report", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Genotype–phenotype discordance");

    await page.getByRole("link", { name: "Open demo" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "Research overview" })).toBeVisible();
    await expect(page.getByText("Synthetic demonstration dataset — not research evidence")).toBeVisible();
    await expect(page.getByText("220 isolates", { exact: false }).first()).toBeVisible();

    await page.getByRole("link", { name: "Data Quality", exact: true }).click();
    await expect(page).toHaveURL(/\/quality$/);
    await expect(page.getByRole("heading", { name: "Data quality audit" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Issue register" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Identifier matching review" })).toBeVisible();

    await page.getByRole("link", { name: "Geno–Pheno Analysis", exact: true }).click();
    await expect(page).toHaveURL(/\/analysis$/);
    await expect(page.getByRole("heading", { name: "Genotype–phenotype comparison" })).toBeVisible();
    await expect(page.getByText("eligible pairs", { exact: false }).first()).toBeVisible();

    await page.getByLabel("Organism stratum").selectOption("Escherichia coli");
    await page.getByLabel("Antibiotic stratum").selectOption("ceftriaxone");
    await page.getByRole("button", { name: "Run analysis" }).click();
    await expect(page).toHaveURL(/organism=Escherichia\+coli/);
    await expect(page).toHaveURL(/antibiotic=ceftriaxone/);
    await expect(page.getByText("147", { exact: false }).first()).toBeVisible();

    await page.getByRole("link", { name: "Discordance", exact: true }).click();
    await expect(page).toHaveURL(/\/investigations$/);
    await expect(page.getByRole("heading", { name: "Discordance investigation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Triage queue" })).toBeVisible();
    await page.getByRole("button", { name: "Inspect" }).first().click();
    await expect(page.getByText("Reviewing pair")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save note" })).toBeVisible();

    await page.getByRole("link", { name: "Research Reports", exact: true }).click();
    await expect(page).toHaveURL(/\/reports$/);
    await expect(page.getByRole("heading", { name: "Research report builder" })).toBeVisible();
    await expect(page.locator("#report-preview")).toContainText("SYNTHETIC");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Markdown" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^amr-pulse-report-.*\.md$/);
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const contents = await readFile(filePath!, "utf8");
    expect(contents).toContain("Data and provenance");
    expect(contents).toContain("SYNTHETIC");
  });

  test("export endpoints carry provenance and deterministic results", async ({ request }) => {
    const manifest = await request.get("/api/manifest");
    expect(manifest.ok()).toBeTruthy();
    const manifestBody = await manifest.json();
    expect(manifestBody.dataset.type).toBe("SYNTHETIC");
    expect(manifestBody.dataset.seed).toBe(20261122);
    expect(manifestBody.software.disclaimer).toContain("Not a diagnostic device");

    const result = await request.get("/api/analysis/export?format=json&organism=Escherichia%20coli&antibiotic=ceftriaxone");
    expect(result.ok()).toBeTruthy();
    const body = await result.json();
    expect(body.provenance.datasetType).toBe("SYNTHETIC");
    expect(body.analysis.summary.eligiblePairs).toBe(147);

    const csv = await request.get("/api/analysis/export?resource=exclusions&format=csv&organism=Escherichia%20coli&antibiotic=ceftriaxone");
    expect(csv.ok()).toBeTruthy();
    expect(await csv.text()).toContain("missing_genomic_panel");
  });

  test("assistant answers without a provider and never exposes a key", async ({ page }) => {
    await page.goto("/ai-workspace");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("AI research assistant");
    await page.getByLabel("Question for the research assistant").fill("Summarise the genotype-phenotype agreement in this demo.");
    await page.getByRole("button", { name: "Ask", exact: true }).click();
    await expect(page.getByText(/Deterministic summary — no AI provider/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/sk-[a-zA-Z0-9]/)).toHaveCount(0);
  });
});
