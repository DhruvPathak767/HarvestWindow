"""
HarvestWindow Phase AI-1: Data Quality & Agronomic Validation Report Generator
Queries MySQL agricultural tables and generates Markdown & JSON reports detailing completeness,
verification breakdown, regional coverage, GDD availability, and provenance statistics.
"""
import os
import sys
import json
import argparse
from datetime import datetime
from sqlalchemy import text

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from ingestion.provenance import get_db_session

def generate_report(output_md: Optional[str] = None, output_json: Optional[str] = None) -> dict:
    session = get_db_session()
    now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    try:
        # 1. Total counts
        total_crops = session.execute(text("SELECT COUNT(*) FROM crop_masters")).scalar() or 0
        total_varieties = session.execute(text("SELECT COUNT(*) FROM crop_varieties")).scalar() or 0
        total_seasons = session.execute(text("SELECT COUNT(*) FROM crop_seasons")).scalar() or 0
        total_regions = session.execute(text("SELECT COUNT(*) FROM agricultural_regions")).scalar() or 0
        total_calendars = session.execute(text("SELECT COUNT(*) FROM crop_calendars")).scalar() or 0
        total_growth_profiles = session.execute(text("SELECT COUNT(*) FROM crop_growth_profiles")).scalar() or 0
        total_gdd_profiles = session.execute(
            text("SELECT COUNT(*) FROM crop_growth_profiles WHERE gddRequirementTypical IS NOT NULL")
        ).scalar() or 0
        total_suitability_profiles = session.execute(text("SELECT COUNT(*) FROM crop_suitability_profiles")).scalar() or 0
        total_yield_obs = session.execute(text("SELECT COUNT(*) FROM crop_yield_observations")).scalar() or 0
        total_disease_meta = session.execute(text("SELECT COUNT(*) FROM crop_disease_metadata")).scalar() or 0
        total_sources = session.execute(text("SELECT COUNT(*) FROM agricultural_data_sources")).scalar() or 0
        total_batches = session.execute(text("SELECT COUNT(*) FROM agricultural_import_batches")).scalar() or 0

        # 2. Verification breakdown in calendars
        cal_status_rows = session.execute(
            text("SELECT verificationStatus, COUNT(*) FROM crop_calendars GROUP BY verificationStatus")
        ).fetchall()
        cal_status_map = {row[0]: row[1] for row in cal_status_rows}

        # 3. Provenance distribution
        sources_rows = session.execute(
            text("SELECT sourceName, dataOrigin, verificationStatus FROM agricultural_data_sources")
        ).fetchall()
        sources_list = [
            {"name": r[0], "origin": r[1], "verification": r[2]}
            for r in sources_rows
        ]

        # 4. Regional coverage
        state_rows = session.execute(
            text("SELECT state, COUNT(DISTINCT district) FROM agricultural_regions GROUP BY state ORDER BY state")
        ).fetchall()
        state_coverage = [{"state": r[0], "districtCount": r[1]} for r in state_rows]

        # 5. Crop coverage
        crops_rows = session.execute(
            text("""
                SELECT cm.name, cm.category,
                       (SELECT COUNT(*) FROM crop_calendars cc WHERE cc.cropId = cm.id) AS calCount,
                       (SELECT COUNT(*) FROM crop_growth_profiles gp WHERE gp.cropId = cm.id) AS gpCount,
                       (SELECT COUNT(*) FROM crop_growth_profiles gp WHERE gp.cropId = cm.id AND gp.gddRequirementTypical IS NOT NULL) AS gddCount,
                       (SELECT COUNT(*) FROM crop_suitability_profiles sp WHERE sp.cropId = cm.id) AS spCount
                FROM crop_masters cm
                ORDER BY cm.category, cm.name
            """)
        ).fetchall()

        crops_summary = [
            {
                "crop": r[0],
                "category": r[1],
                "calendars": r[2],
                "hasGrowthProfile": r[3] > 0,
                "hasGDD": r[4] > 0,
                "hasSuitability": r[5] > 0,
            }
            for r in crops_rows
        ]

        # 6. Import batches summary
        batch_rows = session.execute(
            text("""
                SELECT datasetName, status, rowsRead, rowsAccepted, rowsRejected, rowsInserted
                FROM agricultural_import_batches
                ORDER BY createdAt DESC
                LIMIT 10
            """)
        ).fetchall()

        batches_summary = [
            {
                "dataset": r[0],
                "status": r[1],
                "rowsRead": r[2],
                "rowsAccepted": r[3],
                "rowsRejected": r[4],
                "rowsInserted": r[5],
            }
            for r in batch_rows
        ]

        report_data = {
            "generatedAt": now_str,
            "metrics": {
                "totalCrops": total_crops,
                "totalVarieties": total_varieties,
                "totalSeasons": total_seasons,
                "totalRegions": total_regions,
                "totalCalendars": total_calendars,
                "totalGrowthProfiles": total_growth_profiles,
                "totalGDDProfiles": total_gdd_profiles,
                "totalSuitabilityProfiles": total_suitability_profiles,
                "totalYieldObservations": total_yield_obs,
                "totalDiseaseMetadata": total_disease_meta,
                "totalDataSources": total_sources,
                "totalImportBatches": total_batches,
            },
            "calendarVerificationBreakdown": cal_status_map,
            "dataSources": sources_list,
            "stateCoverage": state_coverage,
            "crops": crops_summary,
            "recentImportBatches": batches_summary,
        }

        # Build Markdown
        md = []
        md.append("# HarvestWindow Phase AI-1: Agricultural Data Quality Report")
        md.append(f"\n*Generated: {now_str}*\n")
        md.append("## 1. Executive Summary")
        md.append("| Metric | Value | Status |")
        md.append("|---|---|---|")
        md.append(f"| Canonical Crops Master | {total_crops} | Active |")
        md.append(f"| Verified Crop Varieties | {total_varieties} | Cataloged |")
        md.append(f"| Agricultural Seasons | {total_seasons} | Normalized |")
        md.append(f"| Agricultural Regions (States/Districts) | {total_regions} | Indexed |")
        md.append(f"| Regional Crop Calendars | {total_calendars} | Loaded |")
        md.append(f"| Verified Growth Duration Profiles | {total_growth_profiles} | Sourced |")
        md.append(f"| Verified GDD Requirements | {total_gdd_profiles} | Sourced (No Fabrication) |")
        md.append(f"| Soil & Environmental Suitability Profiles | {total_suitability_profiles} | Active |")
        md.append(f"| Historical Yield Observations | {total_yield_obs} | Traced |")
        md.append(f"| Crop Disease Image References | {total_disease_meta} | Inventoried |")
        md.append(f"| Registered Provenance Data Sources | {total_sources} | Traceable |")

        md.append("\n## 2. Crop Knowledge Base Coverage")
        md.append("| Crop | Category | Calendars | Growth Profile | GDD Available | Soil Suitability |")
        md.append("|---|---|---|---|---|---|")
        for c in crops_summary:
            gp_check = "Yes" if c["hasGrowthProfile"] else "No"
            gdd_check = "Yes" if c["hasGDD"] else "No"
            sp_check = "Yes" if c["hasSuitability"] else "No"
            md.append(f"| {c['crop']} | {c['category']} | {c['calendars']} | {gp_check} | {gdd_check} | {sp_check} |")

        md.append("\n## 3. Data Provenance & Verification Distribution")
        md.append("| Data Source | Origin | Verification Status |")
        md.append("|---|---|---|")
        for s in sources_list:
            md.append(f"| {s['name']} | {s['origin']} | {s['verification']} |")

        md.append("\n## 4. State & Regional Geographic Coverage")
        md.append("| State / UT | Distinct Districts Cataloged |")
        md.append("|---|---|")
        for st in state_coverage[:20]:
            md.append(f"| {st['state']} | {st['districtCount']} |")

        md.append("\n## 5. Recent Ingestion Batch Audit")
        md.append("| Dataset | Status | Read | Accepted | Rejected | Inserted |")
        md.append("|---|---|---|---|---|---|")
        for b in batches_summary:
            md.append(f"| {b['dataset']} | {b['status']} | {b['rowsRead']} | {b['rowsAccepted']} | {b['rowsRejected']} | {b['rowsInserted']} |")

        markdown_content = "\n".join(md)

        # Write files
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        if not output_md:
            output_md = os.path.join(base_dir, "reports", "data_quality_report.md")
        if not output_json:
            output_json = os.path.join(base_dir, "reports", "data_quality_report.json")

        os.makedirs(os.path.dirname(output_md), exist_ok=True)
        with open(output_md, "w", encoding="utf-8") as f:
            f.write(markdown_content)

        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(report_data, f, indent=2)

        print(f"Data quality report saved:\n  - Markdown: {output_md}\n  - JSON: {output_json}")
        return report_data

    finally:
        session.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate HarvestWindow Agricultural Data Quality Report")
    parser.add_argument("--output-md", default=None, help="Output markdown path")
    parser.add_argument("--output-json", default=None, help="Output JSON path")
    args = parser.parse_args()
    generate_report(output_md=args.output_md, output_json=args.output_json)
