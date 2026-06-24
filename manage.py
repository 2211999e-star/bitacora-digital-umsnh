from __future__ import annotations

import importlib.util
import os
import sys

app_spec = importlib.util.find_spec("app")
if app_spec is None:
    sys.stderr.write(
        "ERROR: El paquete 'app' no existe en este repositorio.\n"
        "Este proyecto actualmente solo incluye páginas estáticas.\n"
        "Para ver la aplicación abre 'bitacora-digital-umsnh/index.html' o usa:\n"
        "  python -m http.server 8000\n"
    )
    sys.exit(1)

import click

from app import create_app, db
from app.models import User
from app.utils.import_excel import import_workbook


app = create_app()


@app.cli.command("init-db")
@click.option("--admin-user", default="admin", show_default=True)
@click.option("--admin-pass", default="admin", show_default=True)
def init_db(admin_user: str, admin_pass: str):
    """Crea la base de datos y un usuario admin inicial."""
    db.create_all()
    user = User.query.filter_by(username=admin_user).first()
    if not user:
        user = User(username=admin_user, role="admin")
        user.set_password(admin_pass)
        db.session.add(user)
        db.session.commit()
        click.echo(f"OK: usuario creado -> {admin_user}")
    else:
        click.echo("OK: usuario admin ya existe")


@app.cli.command("import-excel")
@click.argument("path", required=True)
def import_excel_cmd(path: str):
    """Importa un Excel (formato del ejemplo) a la BD."""
    if not os.path.exists(path):
        raise click.ClickException(f"No existe: {path}")
    db.create_all()
    counts = import_workbook(path)
    click.echo(f"OK: importado -> {counts}")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)

