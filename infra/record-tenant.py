#!/usr/bin/env python3
"""Records/updates one tenant's entry in infra/tenants.json.

Usage: record-tenant.py <tenant-id> <region> <function-url>

This file is the lightweight tenant registry for the single-user-per-
instance model (see spec/09-multi-tenancy.md) - no database needed since
tenants are provisioned by an admin running provision-tenant.sh, not via
self-serve signup.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

def main() -> None:
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)

    tenant_id, region, function_url = sys.argv[1:4]
    registry_path = Path(__file__).parent / "tenants.json"

    registry = json.loads(registry_path.read_text()) if registry_path.exists() else {"tenants": []}
    tenants = registry.setdefault("tenants", [])

    now = datetime.now(timezone.utc).isoformat()
    existing = next((t for t in tenants if t["tenantId"] == tenant_id), None)
    if existing:
        existing.update({"region": region, "functionUrl": function_url, "updatedAt": now})
    else:
        tenants.append({
            "tenantId": tenant_id,
            "stackName": f"dillinger-{tenant_id}",
            "region": region,
            "functionUrl": function_url,
            "createdAt": now,
            "updatedAt": now,
        })

    registry_path.write_text(json.dumps(registry, indent=2) + "\n")

if __name__ == "__main__":
    main()
